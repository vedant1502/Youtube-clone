const fs = require("node:fs/promises");
const http = require("node:http");
const path = require("node:path");

const portArgument = process.argv.find((argument) => argument.startsWith("--port="));
const cliPort = portArgument ? Number(portArgument.replace("--port=", "")) : 0;
const PORT = Number(process.env.PORT) || cliPort || 3000;
const ROOT = __dirname;
const DATA_FILE = path.join(ROOT, "data", "videos.json");

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp"
};

async function getVideos() {
  const file = await fs.readFile(DATA_FILE, "utf8");
  return JSON.parse(file);
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  response.end(JSON.stringify(payload));
}

function includesSearchTerm(video, searchTerm) {
  const searchableText = [
    video.title,
    video.author,
    video.stats,
    video.duration
  ].join(" ").toLowerCase();

  return searchableText.includes(searchTerm);
}

async function handleApi(request, response, url) {
  if (url.pathname === "/api/health") {
    sendJson(response, 200, { ok: true });
    return true;
  }

  if (url.pathname === "/api/videos") {
    const searchTerm = (url.searchParams.get("search") || "").trim().toLowerCase();
    const videos = await getVideos();
    const filteredVideos = searchTerm
      ? videos.filter((video) => includesSearchTerm(video, searchTerm))
      : videos;

    sendJson(response, 200, {
      count: filteredVideos.length,
      videos: filteredVideos
    });
    return true;
  }

  if (url.pathname.startsWith("/api/")) {
    sendJson(response, 404, { error: "API route not found" });
    return true;
  }

  return false;
}

function getStaticFilePath(urlPathname) {
  const decodedPath = decodeURIComponent(urlPathname);
  const relativePath = decodedPath === "/" ? "index.html" : decodedPath.replace(/^\/+/, "");
  const filePath = path.resolve(ROOT, relativePath);
  const pathFromRoot = path.relative(ROOT, filePath);

  if (pathFromRoot.startsWith("..") || path.isAbsolute(pathFromRoot)) {
    return null;
  }

  return filePath;
}

async function serveStaticFile(response, urlPathname) {
  const filePath = getStaticFilePath(urlPathname);

  if (!filePath) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  try {
    const stats = await fs.stat(filePath);
    const finalPath = stats.isDirectory() ? path.join(filePath, "index.html") : filePath;
    const file = await fs.readFile(finalPath);
    const extension = path.extname(finalPath).toLowerCase();

    response.writeHead(200, {
      "Content-Type": mimeTypes[extension] || "application/octet-stream",
      "Cache-Control": extension === ".html" ? "no-store" : "public, max-age=3600"
    });
    response.end(file);
  } catch (error) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);

  try {
    const handledByApi = await handleApi(request, response, url);

    if (!handledByApi) {
      await serveStaticFile(response, url.pathname);
    }
  } catch (error) {
    console.error(error);
    sendJson(response, 500, { error: "Server error" });
  }
});

server.listen(PORT, () => {
  console.log(`YouTube clone backend running at http://localhost:${PORT}`);
});
