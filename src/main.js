import pluginJSON from '../plugin.json'
import { wgsl } from "@iizukak/codemirror-lang-wgsl";

let editorLanguages

class AcodePlugin {
  #style = document.createElement('style')
  async init({ baseUrl, firstInit }) {
    const style = this.#style
    style.textContent = (`
      .file_type_wgsl::before {
        display: inline-block;
        content: '';
        background-image: url("${baseUrl}webgpu-notext.svg");
        background-size: contain;
        background-repeat: no-repeat;
        height: 1em;
        width: 1em;
      }
    `)
    document.head.append(style)
    
    editorLanguages.unregister("wgsl")
		editorLanguages.register(
		  "wgsl", "wgsl", "WGSL",
		  async () => [wgsl()]
		);
  }

  destroy() {
    editorLanguages.unregister("wgsl")
		this.#style.remove()
  }
}

if (typeof acode !== "undefined") {
  editorLanguages = acode.require("editorLanguages")
  let acodePlugin
  acode.setPluginInit(pluginJSON.id, async (baseUrl, $page, options) => {
    acodePlugin = new AcodePlugin();
    if (!baseUrl.endsWith('/')) baseUrl += '/'
    acodePlugin.baseUrl = baseUrl
    await acodePlugin.init({ baseUrl, firstInit: options.firstInit })
  })
  acode.setPluginUnmount(pluginJSON.id, () => {
    acodePlugin?.destroy()
  })
}
