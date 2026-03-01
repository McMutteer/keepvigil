FROM node:22-alpine

WORKDIR /app

# Simple health check server as placeholder
RUN echo '                                                        \
const http = require("http");                                     \
const server = http.createServer((req, res) => {                  \
  if (req.url === "/health") {                                    \
    res.writeHead(200, { "Content-Type": "application/json" });   \
    res.end(JSON.stringify({ status: "ok", service: "vigil", version: "0.0.1" })); \
  } else {                                                        \
    res.writeHead(200, { "Content-Type": "application/json" });   \
    res.end(JSON.stringify({                                      \
      name: "Vigil",                                              \
      tagline: "Your test plans, actually tested.",                \
      status: "coming-soon",                                      \
      domain: "keepvigil.dev"                                     \
    }));                                                           \
  }                                                               \
});                                                               \
server.listen(process.env.PORT || 3200, () => {                   \
  console.log("Vigil placeholder running on port " + (process.env.PORT || 3200)); \
});                                                               \
' > server.js

EXPOSE 3200

CMD ["node", "server.js"]
