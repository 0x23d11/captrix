import { createRoot } from "react-dom/client";
import Home from "./home";

document.body.className = "h-full";
document.documentElement.className = "h-full";
const root = createRoot(document.getElementById("root"));
root.render(<Home />);
