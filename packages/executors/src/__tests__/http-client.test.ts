import { describe, it, expect } from "vitest";

import { validateBaseUrl } from "../http-client.js";

describe("validateBaseUrl", () => {
  // -----------------------------------------------------------------------
  // Valid URLs
  // -----------------------------------------------------------------------
  describe("valid URLs", () => {
    it("accepts https://example.com", () => {
      expect(() => validateBaseUrl("https://example.com")).not.toThrow();
    });

    it("accepts http://preview.example.com", () => {
      expect(() => validateBaseUrl("http://preview.example.com")).not.toThrow();
    });

    it("accepts URL with port", () => {
      expect(() => validateBaseUrl("https://api.example.com:8443")).not.toThrow();
    });

    it("accepts URL with trailing slash", () => {
      expect(() => validateBaseUrl("https://example.com/")).not.toThrow();
    });

    it("accepts URL with path", () => {
      expect(() => validateBaseUrl("https://example.com/api/v1")).not.toThrow();
    });
  });

  // -----------------------------------------------------------------------
  // Non-HTTP protocols rejected
  // -----------------------------------------------------------------------
  describe("non-HTTP protocols", () => {
    it("rejects file:// protocol", () => {
      expect(() => validateBaseUrl("file:///etc/passwd")).toThrow("must use http:// or https://");
    });

    it("rejects ftp:// protocol", () => {
      expect(() => validateBaseUrl("ftp://files.example.com")).toThrow("must use http:// or https://");
    });

    it("rejects javascript: protocol", () => {
      expect(() => validateBaseUrl("javascript:alert(1)")).toThrow("must use http:// or https://");
    });

    it("rejects data: protocol", () => {
      expect(() => validateBaseUrl("data:text/html,<h1>hi</h1>")).toThrow("must use http:// or https://");
    });
  });

  // -----------------------------------------------------------------------
  // Empty URL rejected
  // -----------------------------------------------------------------------
  describe("empty URL", () => {
    it("rejects empty string", () => {
      expect(() => validateBaseUrl("")).toThrow("baseUrl is required");
    });
  });

  // -----------------------------------------------------------------------
  // Path traversal rejected
  // -----------------------------------------------------------------------
  describe("path traversal", () => {
    it("rejects URL with .. in path", () => {
      expect(() => validateBaseUrl("http://example.com/../etc")).toThrow("path traversal");
    });

    it("rejects URL with dotdot pattern in path", () => {
      expect(() => validateBaseUrl("http://example.com/..hidden")).toThrow("path traversal");
    });
  });

  // -----------------------------------------------------------------------
  // Credentials in URL rejected
  // -----------------------------------------------------------------------
  describe("credentials in URL", () => {
    it("rejects URL with user:pass@host", () => {
      expect(() => validateBaseUrl("http://user:pass@example.com")).toThrow("must not contain credentials");
    });

    it("rejects URL with username only", () => {
      expect(() => validateBaseUrl("http://admin@example.com")).toThrow("must not contain credentials");
    });
  });

  // -----------------------------------------------------------------------
  // Blocked hosts rejected
  // -----------------------------------------------------------------------
  describe("blocked hosts", () => {
    it("rejects localhost", () => {
      expect(() => validateBaseUrl("http://localhost")).toThrow("must not target localhost");
    });

    it("rejects localhost with trailing dot", () => {
      expect(() => validateBaseUrl("http://localhost.")).toThrow("must not target localhost");
    });

    it("rejects 127.0.0.1", () => {
      expect(() => validateBaseUrl("http://127.0.0.1")).toThrow("must not target localhost");
    });

    it("rejects 0.0.0.0", () => {
      expect(() => validateBaseUrl("http://0.0.0.0")).toThrow("must not target localhost");
    });

    it("rejects ::1", () => {
      expect(() => validateBaseUrl("http://[::1]")).toThrow("must not target localhost");
    });

    it("rejects localhost with port", () => {
      expect(() => validateBaseUrl("http://localhost:3000")).toThrow("must not target localhost");
    });
  });

  // -----------------------------------------------------------------------
  // Private IPv4 ranges rejected
  // -----------------------------------------------------------------------
  describe("private IPv4 ranges", () => {
    it("rejects 10.x.x.x (class A private)", () => {
      expect(() => validateBaseUrl("http://10.0.0.1")).toThrow("must not target private IP ranges");
    });

    it("rejects 10.255.255.255", () => {
      expect(() => validateBaseUrl("http://10.255.255.255")).toThrow("must not target private IP ranges");
    });

    it("rejects 172.16.x.x (class B private lower)", () => {
      expect(() => validateBaseUrl("http://172.16.0.1")).toThrow("must not target private IP ranges");
    });

    it("rejects 172.31.x.x (class B private upper)", () => {
      expect(() => validateBaseUrl("http://172.31.255.255")).toThrow("must not target private IP ranges");
    });

    it("rejects 192.168.x.x (class C private)", () => {
      expect(() => validateBaseUrl("http://192.168.1.1")).toThrow("must not target private IP ranges");
    });

    it("rejects 169.254.x.x (link-local)", () => {
      expect(() => validateBaseUrl("http://169.254.169.254")).toThrow("must not target private IP ranges");
    });
  });

  // -----------------------------------------------------------------------
  // Private IPv6 ranges rejected
  // -----------------------------------------------------------------------
  describe("private IPv6 ranges", () => {
    it("rejects fc00:: (unique local)", () => {
      expect(() => validateBaseUrl("http://[fc00::1]")).toThrow("must not target private IP ranges");
    });

    it("rejects fd00:: (unique local)", () => {
      expect(() => validateBaseUrl("http://[fd12::1]")).toThrow("must not target private IP ranges");
    });

    it("rejects fe80:: (link-local)", () => {
      expect(() => validateBaseUrl("http://[fe80::1]")).toThrow("must not target private IP ranges");
    });
  });

  // -----------------------------------------------------------------------
  // Edge cases
  // -----------------------------------------------------------------------
  describe("edge cases", () => {
    it("allows public IP addresses", () => {
      expect(() => validateBaseUrl("http://8.8.8.8")).not.toThrow();
    });

    it("allows 172.15.x.x (below private range)", () => {
      expect(() => validateBaseUrl("http://172.15.0.1")).not.toThrow();
    });

    it("allows 172.32.x.x (above private range)", () => {
      expect(() => validateBaseUrl("http://172.32.0.1")).not.toThrow();
    });

    it("allows subdomain of localhost-like name", () => {
      // e.g. "notlocalhost.com" should be fine
      expect(() => validateBaseUrl("http://notlocalhost.com")).not.toThrow();
    });
  });
});
