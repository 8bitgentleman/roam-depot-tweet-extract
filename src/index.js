import toConfigPageName from "roamjs-components/util/toConfigPageName";
import runExtension from "roamjs-components/util/runExtension";
import { createConfigObserver } from "roamjs-components/components/ConfigPage";

const extensionId = "roam-depot-tweet-extract";
const CONFIG = toConfigPageName(extensionId);
export default runExtension({
  extensionId, 
  run: () => {
    createConfigObserver({ title: CONFIG, config: { tabs: [] } });
  },
  unload: () => {},
});
  