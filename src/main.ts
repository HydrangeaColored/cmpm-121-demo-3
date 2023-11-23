import "leaflet/dist/leaflet.css";
import "./style.css";
import leaflet, { LatLngExpression } from "leaflet";
import luck from "./luck";
import "./leafletWorkaround";
import { Board, Geocache, Cell, Coin } from "./board";
import lines from "leaflet";

const MERRILL_CLASSROOM = leaflet.latLng({
  lat: 36.9995,
  lng: -122.0533,
});

const NULL_ISLAND = leaflet.latLng({
  lat: 0,
  lng: 0,
});

const GAMEPLAY_ZOOM_LEVEL = 19;
const TILE_DEGREES = 1e-4;
//const NEIGHBORHOOD_SIZE = 1e-3;
const NEIGHBORHOOD_SIZE = 8;
const PIT_SPAWN_PROBABILITY = 0.1;

const mapBoard = new Board(TILE_DEGREES, NEIGHBORHOOD_SIZE);

const mapContainer = document.querySelector<HTMLElement>("#map")!;
let playerLines: LatLngExpression[] = [];
const currPits: leaflet.Layer[] = [];
let currCoins: Coin[] = [];

const map = leaflet.map(mapContainer, {
  center: NULL_ISLAND,
  zoom: GAMEPLAY_ZOOM_LEVEL,
  minZoom: GAMEPLAY_ZOOM_LEVEL,
  maxZoom: GAMEPLAY_ZOOM_LEVEL,
  zoomControl: true,
  scrollWheelZoom: true,
});

leaflet
  .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      // eslint-disable-next-line @typescript-eslint/quotes
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  })
  .addTo(map);

const playerMarker = leaflet.marker(MERRILL_CLASSROOM);
playerMarker.bindTooltip("That's you!");
playerMarker.addTo(map);

if (localStorage.getItem("playerMarker")) {
  playerMarker.setLatLng(
    JSON.parse(localStorage.getItem("playerMarker")!) as leaflet.LatLng,
  );
}

if (localStorage.getItem("playerInventory")) {
  currCoins = JSON.parse(localStorage.getItem("playerInventory")!) as Coin[];
}
if (localStorage.getItem("playerLines")) {
  playerLines = JSON.parse(
    localStorage.getItem("playerLines")!,
  ) as LatLngExpression[];
}
if (localStorage.getItem("playerVisited")) {
  mapBoard.updateCurrCells(
    JSON.parse(localStorage.getItem("playerVisited")!) as string[][],
  );
}

function moveMapToLoc(playerPos: leaflet.LatLng) {
  map.setView(playerPos);
  currPits.forEach((currPit) => {
    currPit.remove();
  });
  localStorage.setItem(
    "marker",
    JSON.stringify({
      lat: playerMarker.getLatLng().lat,
      lng: playerMarker.getLatLng().lng,
    }),
  );
  playerLines.push({ lat: playerPos.lat, lng: playerPos.lng });
  localStorage.setItem("playerLines", JSON.stringify(playerLines));
  lines.polyline(playerLines).addTo(map);
  spawnCache(playerPos);
}
moveMapToLoc(playerMarker.getLatLng());

const sensorButton = document.querySelector("#sensor")!;
sensorButton.addEventListener("click", () => {
  navigator.geolocation.watchPosition((position) => {
    playerMarker.getLatLng().lat = position.coords.latitude;
    playerMarker.getLatLng().lng = position.coords.longitude;
    moveMapToLoc(playerMarker.getLatLng());
  });
  playerLines = [];
});

const moveSouthButton = document.querySelector("#south")!;
moveSouthButton.addEventListener("click", () => {
  playerMarker.getLatLng().lat -= 0.0001;
  const markerLatLng = playerMarker.getLatLng();
  playerMarker.setLatLng(markerLatLng);
  map.setView(playerMarker.getLatLng());
  moveMapToLoc(playerMarker.getLatLng());
});

const moveNorthButton = document.querySelector("#north")!;
moveNorthButton.addEventListener("click", () => {
  playerMarker.getLatLng().lat += 0.0001;
  const markerLatLng = playerMarker.getLatLng();
  playerMarker.setLatLng(markerLatLng);
  map.setView(playerMarker.getLatLng());
  moveMapToLoc(playerMarker.getLatLng());
});

const moveEastButton = document.querySelector("#east")!;
moveEastButton.addEventListener("click", () => {
  playerMarker.getLatLng().lng += 0.0001;
  const markerLatLng = playerMarker.getLatLng();
  playerMarker.setLatLng(markerLatLng);
  map.setView(playerMarker.getLatLng());
  moveMapToLoc(playerMarker.getLatLng());
});

const moveWestButton = document.querySelector("#west")!;
moveWestButton.addEventListener("click", () => {
  playerMarker.getLatLng().lng -= 0.0001;
  const markerLatLng = playerMarker.getLatLng();
  playerMarker.setLatLng(markerLatLng);
  map.setView(playerMarker.getLatLng());
  moveMapToLoc(playerMarker.getLatLng());
});

const resetMap = document.querySelector("#reset")!;
resetMap.addEventListener("click", () => {
  const resetPrompt = confirm("Are you sure you want to reset?");
  if (resetPrompt) {
    localStorage.clear();
    location.reload();
  }
});

function makePit(i: number, j: number) {
  const cell = mapBoard.getCellForPoint(leaflet.latLng({ lat: i, lng: j }));

  const pit = leaflet.rectangle(mapBoard.getCellBounds(cell)) as leaflet.Layer;
  pit.bindPopup(() => {
    const container = document.createElement("div");
    pitToPlayer(mapBoard.getCacheForPoint(cell), container);
    playerToPit(mapBoard.getCacheForPoint(cell), container);
    return container;
  });
  pit.addTo(map);
  currPits.push(pit);
}

function spawnCache(currPos: leaflet.LatLng) {
  for (let currI = -NEIGHBORHOOD_SIZE; currI < NEIGHBORHOOD_SIZE; currI++) {
    for (let currJ = -NEIGHBORHOOD_SIZE; currJ < NEIGHBORHOOD_SIZE; currJ++) {
      const currCell = mapBoard.getCellForPoint(
        leaflet.latLng({
          lat: currPos.lat + currI * TILE_DEGREES,
          lng: currPos.lng + currJ * TILE_DEGREES,
        }),
      );
      if (luck([currCell.i, currCell.j].toString()) < PIT_SPAWN_PROBABILITY) {
        makePit(currCell.i, currCell.j);
      }
    }
  }
}
spawnCache(playerMarker.getLatLng());

function pitToPlayer(pit: Geocache, container: HTMLElement) {
  pit.currCoins.forEach((thisCoin) => {
    const currCoin = document.createElement("button") as HTMLElement;
    container.append(currCoin);
    currCoin.innerHTML = `<div>Coin in pit: <span id = "coin">${thisCoin.id}</span></div>`;
    const currPlayerCoin = document.createElement("button") as HTMLElement;
    currPlayerCoin.hidden = true;
    container.append(currPlayerCoin);
    currPlayerCoin.innerHTML = `<div>Coin in player: <span id = "coin">${thisCoin.id}</span></div>`;
    currCoin.addEventListener("click", () => {
      currCoin.hidden = true;
      currPlayerCoin.hidden = false;
      pit.removeCoin(thisCoin);
      currCoins.push(thisCoin);
      updatePitAtPoint(pit.cell, pit.toMomento(), mapBoard);
    });
    currPlayerCoin.addEventListener("click", () => {
      currCoin.hidden = false;
      currPlayerCoin.hidden = true;
      pit.addCoin(thisCoin);
      removeFromPlayer(thisCoin);
      updatePitAtPoint(pit.cell, pit.toMomento(), mapBoard);
    });
  });
}

function playerToPit(pit: Geocache, container: HTMLElement) {
  currCoins.forEach((thisCoin) => {
    const currCoin = document.createElement("button") as HTMLElement;
    container.append(currCoin);
    currCoin.innerHTML = `<div>Coin in player: <span id = "coin">${thisCoin.id}</span></div>`;
    const currPlayerCoin = document.createElement("button") as HTMLElement;
    currPlayerCoin.hidden = true;
    container.append(currPlayerCoin);
    currPlayerCoin.innerHTML = `<div>Coin in put: <span id = "coin">${thisCoin.id}</span></div>`;
    currCoin.addEventListener("click", () => {
      currCoin.hidden = true;
      currPlayerCoin.hidden = false;
      pit.addCoin(thisCoin);
      removeFromPlayer(thisCoin);
      updatePitAtPoint(pit.cell, pit.toMomento(), mapBoard);
    });
    currPlayerCoin.addEventListener("click", () => {
      currCoin.hidden = false;
      currPlayerCoin.hidden = true;
      pit.removeCoin(thisCoin);
      currCoins.push(thisCoin);
      updatePitAtPoint(pit.cell, pit.toMomento(), mapBoard);
    });
  });
}

// source: https://byby.dev/js-remove-elements-from-array
function removeFromPlayer(currCoin: Coin) {
  currCoins.forEach((item, index) => {
    if (item == currCoin) {
      currCoins.splice(index, 1);
    }
  });
}

function updatePitAtPoint(currCell: Cell, data: string, currBoard: Board) {
  const key = [currCell.i, currCell.j].toString();
  currBoard.knownCells.set(key, data);
  const dataString = JSON.stringify(Array.from(currBoard.knownCells.entries()));
  localStorage.setItem("playerVisited", dataString);
  localStorage.setItem("playerInventory", JSON.stringify(currCoins));
}
