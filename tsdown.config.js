import { defineConfig } from 'tsdown'
import * as fs from "fs/promises"
import * as path from 'path'
import { createWriteStream as fsCreateWriteStream } from 'fs'
import JSZip from 'jszip'

const __dirname = import.meta.dirname
const outDir = "dist"

export default defineConfig({
  entry: 'src/main.js',
  outDir,
  platform: "browser",
  target: "esnext",
  format: "iife",
  deps: {
    alwaysBundle: /.*/,
    neverBundle: [
      "codemirror",
      "@codemirror/autocomplete",
      "@codemirror/commands",
      "@codemirror/language",
      "@codemirror/lint",
      "@codemirror/search",
      "@codemirror/state",
      "@codemirror/view",
      "@lezer/common",
      "@lezer/highlight",
      "@lezer/lr"
    ],
  },
  outputOptions: {
    globals: {
      "codemirror": "acode.require('codemirrordule')",
      "@codemirror/autocomplete": "acode.require('@codemirror/autocomplete')",
      "@codemirror/commands": "acode.require('@codemirror/commands')",
      "@codemirror/language": "acode.require('@codemirror/language')",
      "@codemirror/lint": "acode.require('@codemirror/lint')",
      "@codemirror/search": "acode.require('@codemirror/search')",
      "@codemirror/state": "acode.require('@codemirror/state')",
      "@codemirror/view": "acode.require('@codemirror/view')",
      "@lezer/common": "acode.require('@lezer/common')",
      "@lezer/highlight": "acode.require('@lezer/highlight')",
      "@lezer/lr": "acode.require('@lezer/lr')"
    },
  },
  hooks: {
    'build:done': async () => {
      await fs.writeFile(
        path.join(__dirname, 'dist/webgpu-notext.svg'),
        await fs.readFile(path.join(__dirname, 'src/webgpu-notext.svg'), 'utf8')
      )
      await packZip()
      await fs.rm(
        path.join(__dirname, outDir),
        { recursive: true, force: true }
      )
    }
  }
})

async function packZip() {
  const jsonStr = await fs.readFile(path.join(__dirname, "plugin.json"), 'utf8')
  const json = JSON.parse(jsonStr)
  let iconPath = `${json.icon ?? ""}`
  let readmeMd = `${json.readme ?? ""}`
  let changelogMd = `${json.changelogs ?? ""}`

  const zip = new JSZip()
  zip.file('plugin.json', jsonStr)
  if (iconPath) {
  zip.file(iconPath, await fs.readFile(path.join(__dirname, iconPath)))
  }

  let readme, changelog;
  [[readme, readmeMd], [changelog, changelogMd]] = await (async (..._arr) => {
   for (let i = 0; i < 2; i++) {
     const arr = _arr[i]
     let fn = arr[0], ct
    try {
      if (fn) {
        ct = await fs.readFile(path.join(__dirname, fn))
      } else try {
        fn = arr[1]
        ct = await fs.readFile(path.join(__dirname, fn))
      } catch {
        fn = fn.toLowerCase()
        ct = await fs.readFile(path.join(__dirname, fn))
      }
     } catch {
      fn = null
    }
     arr[0] = ct, arr[1] = fn
   }
   return _arr
  })([readmeMd, 'README.md'], [changelogMd, 'CHANGELOG.md'])

  if (readme != null) zip.file(readmeMd, readme)
  if (changelog != null) zip.file(changelogMd, changelog)

  await loadFile(path.join(__dirname, outDir), "")

  async function loadFile(root, file) {
  const path2 = path.join(root, file)
   const stat = await fs.stat(path2)
   if (stat.isDirectory()) {
    const distFiles = await fs.readdir(path2)
    await Promise.all(distFiles.map(async file2 => {
      await loadFile(root, path.join(file, file2))
    }))
    return
   }
   if (/^\/?LICENSE(?:\.txt|\.md)?$/.test(file)) return
   zip.file(file, await fs.readFile(path2))
  }

  const zipFile = "plugin.zip"
  const prm = Promise.withResolvers()
  zip
   .generateNodeStream({ type: 'nodebuffer', streamFiles: true })
 .pipe(fsCreateWriteStream(path.join(__dirname, zipFile)))
    .on('finish', prm.resolve)
    .on('error', prm.reject)
  await prm.promise
  const d = new Date()
  console.log(
    `${d.toLocaleDateString()} ${d.toLocaleTimeString()}:`,
    `Plugin written: ${zipFile}`
  )
}
