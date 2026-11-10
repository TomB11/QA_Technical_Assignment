import { createServer } from "node:http";
import { isIP } from "node:net";

const PORT = 3000;
const REQUIRED_FIELDS = [
  "agent_id",
  "base_board_sn",
  "computer_name",
  "system_product_uuid",
  "os_name",
  "os_major",
  "os_minor",
  "os_build",
  "last_boot_time",
  "last_update_time",
  "adapter_info",
  "session_info",
  "roles",
];

function isValidUUID(value) {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  return typeof value === "string" && uuidRegex.test(value);
}

function isValidUtcTimestamp(value) {
  if (typeof value !== "string") {
    return false;
  }

  const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;

  if (!isoRegex.test(value)) {
    return false;
  }

  const date = new Date(value);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().replace(".000Z", "Z") === value
  );
}

function isValidIpAddress(address) {
  if (typeof address !== "string") {
    return false;
  }

  // IPv6 môže obsahovať aj identifikátor sieťového rozhrania, napr. %7
  if (address.includes("%")) {
    const [ip, zone] = address.split("%");

    return isIP(ip) === 6 && /^[A-Za-z0-9_.-]+$/.test(zone);
  }

  return isIP(address) !== 0;
}

const server = createServer((req, res) => {
  // Accept only POST requests to /healthcheck
  if (req.method !== "POST" || req.url !== "/healthcheck") {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        status: "error",
        errors: ["Endpoint not found"],
      }),
    );
    return;
  }

  let body = "";

  req.on("data", (chunk) => {
    body += chunk;
  });

  req.on("end", () => {
    try {
      const payload = JSON.parse(body);
      const errors = [];

      for (const field of REQUIRED_FIELDS) {
        if (!(field in payload)) {
          errors.push(`Missing required field: ${field}`);
        }
      }

      for (const field of Object.keys(payload)) {
        if (!REQUIRED_FIELDS.includes(field)) {
          errors.push(`Unexpected field: ${field}`);
        }
      }

      if (errors.length > 0) {
        res.writeHead(400, {
          "Content-Type": "application/json",
        });

        res.end(
          JSON.stringify({
            status: "error",
            errors,
          }),
        );

        return;
      }

      const uuidFields = ["agent_id", "system_product_uuid"];

      for (const field of uuidFields) {
        if (!isValidUUID(payload[field])) {
          errors.push(`Invalid UUID format: ${field}`);
        }
      }

      if (errors.length > 0) {
        res.writeHead(400, {
          "Content-Type": "application/json",
        });

        res.end(
          JSON.stringify({
            status: "error",
            errors,
          }),
        );

        return;
      }

      const stringFields = ["base_board_sn", "computer_name", "os_name"];

      for (const field of stringFields) {
        if (typeof payload[field] !== "string") {
          errors.push(`Invalid string field: ${field}`);
        }
      }

      const nonEmptyStringFields = ["computer_name", "os_name"];

      for (const field of nonEmptyStringFields) {
        if (
          typeof payload[field] !== "string" ||
          payload[field].trim() === ""
        ) {
          errors.push(`Invalid non-empty string field: ${field}`);
        }
      }

      const integerFields = ["os_major", "os_minor", "os_build"];

      for (const field of integerFields) {
        if (!Number.isInteger(payload[field]) || payload[field] < 0) {
          errors.push(`Invalid integer field: ${field}`);
        }
      }

      if (errors.length > 0) {
        res.writeHead(400, {
          "Content-Type": "application/json",
        });

        res.end(
          JSON.stringify({
            status: "error",
            errors,
          }),
        );

        return;
      }

      const timestampFields = ["last_boot_time", "last_update_time"];

      for (const field of timestampFields) {
        if (!isValidUtcTimestamp(payload[field])) {
          errors.push(`Invalid UTC timestamp: ${field}`);
        }
      }

      if (errors.length > 0) {
        res.writeHead(400, {
          "Content-Type": "application/json",
        });

        res.end(
          JSON.stringify({
            status: "error",
            errors,
          }),
        );

        return;
      }

      if (
        !Array.isArray(payload.adapter_info) ||
        payload.adapter_info.length === 0
      ) {
        errors.push("Invalid adapter_info: expected a non-empty array");
      } else {
        for (const adapter of payload.adapter_info) {
          if (
            typeof adapter !== "object" ||
            adapter === null ||
            Array.isArray(adapter)
          ) {
            errors.push("Invalid adapter_info item");
            continue;
          }

          if (typeof adapter.name !== "string" || adapter.name.trim() === "") {
            errors.push("Invalid adapter name");
          }

          if (!Array.isArray(adapter.addresses)) {
            errors.push("Invalid adapter addresses");
            continue;
          }

          for (const address of adapter.addresses) {
            if (!isValidIpAddress(address)) {
              errors.push(`Invalid IP address: ${address}`);
            }
          }
        }
      }

      if (errors.length > 0) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "error", errors }));
        return;
      }

      if (!Array.isArray(payload.session_info)) {
        errors.push("Invalid session_info: expected an array");
      } else {
        const requiredSessionFields = [
          "account_name",
          "account_sid",
          "host_name",
          "session_id",
          "session_name",
          "state",
        ];

        for (const session of payload.session_info) {
          if (
            typeof session !== "object" ||
            session === null ||
            Array.isArray(session)
          ) {
            errors.push("Invalid session_info item");
            continue;
          }

          for (const field of requiredSessionFields) {
            if (!(field in session)) {
              errors.push(`Missing session field: ${field}`);
            }
          }

          const stringFields = [
            "account_name",
            "account_sid",
            "host_name",
            "session_name",
            "state",
          ];

          for (const field of stringFields) {
            if (typeof session[field] !== "string") {
              errors.push(`Invalid session field: ${field}`);
            }
          }

          if (
            typeof session.session_id !== "number" ||
            !Number.isInteger(session.session_id) ||
            session.session_id < 0
          ) {
            errors.push("Invalid session_id");
          }

          if (
            typeof session.session_name !== "string" ||
            session.session_name.trim() === ""
          ) {
            errors.push("Invalid session_name");
          }

          const allowedStates = ["Active", "Disconnected"];

          if (!allowedStates.includes(session.state)) {
            errors.push(`Invalid session state: ${session.state}`);
          }
        }
      }

      if (errors.length > 0) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "error", errors }));
        return;
      }

      const allowedRoles = ["workstation", "server", "domain_controller"];

      if (!Array.isArray(payload.roles) || payload.roles.length === 0) {
        errors.push("Invalid roles: expected a non-empty array");
      } else {
        for (const role of payload.roles) {
          if (typeof role !== "string" || !allowedRoles.includes(role)) {
            errors.push(`Invalid role: ${role}`);
          }
        }
      }

      if (errors.length > 0) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "error", errors }));
        return;
      }

      res.writeHead(200, {
        "Content-Type": "application/json",
      });

      res.end(
        JSON.stringify({
          status: "ok",
        }),
      );
    } catch {
      res.writeHead(400, {
        "Content-Type": "application/json",
      });

      res.end(
        JSON.stringify({
          status: "error",
          errors: ["Invalid JSON payload"],
        }),
      );
    }
  });
});

server.listen(PORT, () => {
  console.log(`Healthcheck mock server running at http://localhost:${PORT}`);
});
