import { createRoot } from "react-dom/client";
import App from "./App";
import { installPreviewLocalFetchMock } from "./lib/preview-local-fetch";
import "./index.css";

if (import.meta.env.MODE === "preview-local") {
  installPreviewLocalFetchMock();
}

createRoot(document.getElementById("root")!).render(<App />);
