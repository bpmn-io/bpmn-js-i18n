import fs from "fs-extra";
import path from "path";

import typescript from "@rollup/plugin-typescript";
import { defineConfig } from "rollup";
import dts from 'rollup-plugin-dts';

const getFiles = (dirPath: string) => {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const fileMap = entries
    .filter((entry) => entry.isFile())
    .reduce((accumulator, entry) => {
      const entryName = entry.name;
      const basename = path.basename(entryName, path.extname(entryName));
      accumulator[basename] = path.join(dirPath, entryName);
      return accumulator;
    }, {} as Record<string, string>);
  console.log(fileMap);
  return fileMap;
};

const input = {
  ...getFiles("src/translations"),
  index: "src/main.ts",
};

export default defineConfig([{
  input,
  output: {
    // importAttributesKey: "with",
    preserveModules: true,
    dir: "dist",
    format: "es",
    entryFileNames(chunkInfo) {
      console.log(chunkInfo);
      const dir = chunkInfo.name === "index" ? "" : "translations/";
      return `${dir}[name].js`;
    },
  },
  plugins: [typescript()],  
},
{
  input:'src/main.ts',
  output:{
    format: "es",
    file: "dist/index.d.ts"
  },
  plugins: [dts()],  
}]);
