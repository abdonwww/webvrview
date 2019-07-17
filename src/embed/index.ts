import CONST from "../shared/constants";
import Util from "../shared/util";
import LoadingIndicator from "./loading-indicator";
import WorldRenderer from "./world-renderer";

const loadingIndicator = new LoadingIndicator();
const worldRenderer = new WorldRenderer();

worldRenderer.on("error", onRenderError);
worldRenderer.on("load", onRenderLoad);
worldRenderer.on("modechange", onModeChange);
worldRenderer.on("ended", onEnded);
worldRenderer.on("play", onPlay);
worldRenderer.hotspotRenderer.on("click", onHotspotClick);

window.worldRenderer = worldRenderer;
