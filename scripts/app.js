const body = document.body;
const grid = document.querySelector(".video-grid");
const statusMessage = document.querySelector(".video-status");
const menuButton = document.querySelector(".menu-button");
const searchForm = document.querySelector(".search-form");
const searchInput = document.querySelector(".search-bar");
const compactViewport = window.matchMedia("(max-width: 700px)");
const tabletViewport = window.matchMedia("(max-width: 900px)");
let searchTimeoutId;

function setStatus(message) {
  statusMessage.textContent = message;
  statusMessage.hidden = message.length === 0;
}

function createElement(tagName, className, text) {
  const element = document.createElement(tagName);

  if (className) {
    element.className = className;
  }

  if (text) {
    element.textContent = text;
  }

  return element;
}

function createImage(className, src, alt) {
  const image = document.createElement("img");
  image.className = className;
  image.src = src;
  image.alt = alt;
  image.loading = "lazy";
  return image;
}

function createLink(href, className, text) {
  const link = document.createElement("a");
  link.href = href;

  if (className) {
    link.className = className;
  }

  if (text) {
    link.textContent = text;
  }

  return link;
}

function createVideoCard(video) {
  const card = createElement("article", "video-preview");
  const thumbnailRow = createElement("div", "thumbnail-row");
  const thumbnailLink = createLink(video.videoUrl, "thumbnail-link");
  const thumbnail = createImage("thumbnail", video.thumbnail, video.title);
  const videoTime = createElement("div", "video-time", video.duration);
  const infoGrid = createElement("div", "video-info-grid");
  const channelPicture = createElement("div", "channel-picture");
  const profilePicture = createImage("profile-picture", video.avatar, `${video.author} channel`);
  const videoInfo = createElement("div", "video-info");
  const title = createElement("p", "video-title");
  const titleLink = createLink(video.videoUrl, "video-title-link", video.title);
  const author = createElement("p", "video-author");
  const authorLink = createLink(video.authorUrl, "text-link", video.author);
  const stats = createElement("p", "video-stats", video.stats);

  thumbnailLink.append(thumbnail);
  thumbnailRow.append(thumbnailLink, videoTime);
  channelPicture.append(profilePicture);
  title.append(titleLink);
  author.append(authorLink);
  videoInfo.append(title, author, stats);
  infoGrid.append(channelPicture, videoInfo);
  card.append(thumbnailRow, infoGrid);

  return card;
}

function renderVideos(videos, searchTerm) {
  grid.replaceChildren();

  if (videos.length === 0) {
    setStatus(`No videos found for "${searchTerm}".`);
    return;
  }

  const fragment = document.createDocumentFragment();
  videos.forEach((video) => fragment.append(createVideoCard(video)));
  grid.append(fragment);
  setStatus("");
}

async function loadVideos(searchTerm = "") {
  const params = new URLSearchParams();

  if (searchTerm) {
    params.set("search", searchTerm);
  }

  setStatus("Loading videos...");

  try {
    const response = await fetch(`/api/videos?${params.toString()}`);

    if (!response.ok) {
      throw new Error("Could not load videos");
    }

    const data = await response.json();
    renderVideos(data.videos, searchTerm);
  } catch (error) {
    setStatus("Videos could not be loaded. Start the backend with npm start.");
  }
}

function syncResponsiveState() {
  body.classList.toggle("is-compact", compactViewport.matches);
  body.classList.toggle("is-tablet", tabletViewport.matches);

  if (!compactViewport.matches) {
    body.classList.remove("sidebar-open");
  }
}

menuButton.addEventListener("click", () => {
  if (compactViewport.matches) {
    body.classList.toggle("sidebar-open");
    return;
  }

  body.classList.toggle("sidebar-collapsed");
});

searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  loadVideos(searchInput.value.trim());
});

searchInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    loadVideos(searchInput.value.trim());
  }
});

searchInput.addEventListener("input", () => {
  window.clearTimeout(searchTimeoutId);
  searchTimeoutId = window.setTimeout(() => {
    loadVideos(searchInput.value.trim());
  }, 180);
});

compactViewport.addEventListener("change", syncResponsiveState);
tabletViewport.addEventListener("change", syncResponsiveState);
syncResponsiveState();
loadVideos();
