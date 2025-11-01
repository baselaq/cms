#!/usr/bin/env node

import { readdir, stat, access } from "fs/promises";
import { join, basename } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Kebab-case regex pattern
const KEBAB_CASE_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// Files and directories that are allowed to not follow kebab-case
const ALLOWED_EXCEPTIONS = new Set([
  "package.json",
  "package-lock.json",
  "pnpm-lock.yaml",
  "vite.config.ts",
  "tsconfig.json",
  "tsconfig.app.json",
  "tsconfig.node.json",
  "tailwind.config.js",
  "eslint.config.js",
  "components.json",
  "README.md",
  "LICENSE",
  ".gitignore",
  ".env",
  ".env.local",
  ".env.example",
  "index.html",
  "node_modules",
  ".git",
  ".husky",
  "dist",
  "build",
  ".vscode",
  ".idea",
  "App.tsx", // Original React file
  "App.css", // Original React file
]);

// Extensions that should follow kebab-case
const VALIDATED_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".css",
  ".scss",
  ".sass",
  ".json",
  ".md",
  ".mjs",
  ".cjs",
  ".d.ts", // TypeScript declaration files
]);

// Packages to validate
const PACKAGES = ["backend", "web", "mobile", "shared"];

// Common source directory names
const SOURCE_DIRS = ["src", "app", "lib"];

async function checkPathExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function getSourceDirs(packageDir) {
  const sourceDirs = [];
  for (const dir of SOURCE_DIRS) {
    const dirPath = join(packageDir, dir);
    if (await checkPathExists(dirPath)) {
      const stats = await stat(dirPath);
      if (stats.isDirectory()) {
        sourceDirs.push({ path: dirPath, basePath: dir });
      }
    }
  }
  return sourceDirs;
}

async function getAllFiles(dir, basePath = "", packageName = "") {
  const files = [];

  try {
    const entries = await readdir(dir);

    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const relativePath = basePath ? join(basePath, entry) : entry;
      const packageRelativePath = `packages/${packageName}/${relativePath}`;

      let stats;
      try {
        stats = await stat(fullPath);
      } catch {
        continue;
      }

      if (stats.isDirectory()) {
        // Skip allowed exception directories
        if (ALLOWED_EXCEPTIONS.has(entry)) {
          continue;
        }

        // Check directory name
        if (!KEBAB_CASE_PATTERN.test(entry)) {
          files.push({
            path: packageRelativePath,
            type: "directory",
            name: entry,
          });
        }

        // Recursively check subdirectories
        const subFiles = await getAllFiles(fullPath, relativePath, packageName);
        files.push(...subFiles);
      } else {
        // Skip allowed exception files
        if (ALLOWED_EXCEPTIONS.has(entry)) {
          continue;
        }

        // Check if file extension should be validated
        let nameToCheck = entry;
        let shouldValidate = false;

        // Handle .page.tsx files specially
        if (entry.endsWith(".page.tsx")) {
          nameToCheck = entry.replace(".page.tsx", "");
          shouldValidate = true;
        } else if (entry.endsWith(".d.ts")) {
          // Handle .d.ts files specially - strip both .d and .ts
          nameToCheck = entry.replace(".d.ts", "");
          shouldValidate = true;
        } else {
          const ext = entry.substring(entry.lastIndexOf("."));
          nameToCheck = basename(entry, ext);
          shouldValidate = VALIDATED_EXTENSIONS.has(ext);
        }

        if (shouldValidate) {
          // Check file name (without extension)
          if (!KEBAB_CASE_PATTERN.test(nameToCheck)) {
            files.push({
              path: packageRelativePath,
              type: "file",
              name: entry,
            });
          }
        }
      }
    }
  } catch (error) {
    // Skip directories that can't be read
    if (error.code !== "ENOENT" && error.code !== "EACCES") {
      console.warn(`⚠️  Could not read directory ${dir}: ${error.message}`);
    }
  }

  return files;
}

async function validateKebabCase() {
  try {
    const projectRoot = join(__dirname, "..");
    const packagesDir = join(projectRoot, "packages");

    console.log(
      "🔍 Validating kebab-case naming convention across packages..."
    );

    let allViolations = [];

    // Process each package
    for (const packageName of PACKAGES) {
      const packageDir = join(packagesDir, packageName);

      // Check if package exists
      if (!(await checkPathExists(packageDir))) {
        continue;
      }

      // Find source directories for this package
      const sourceDirs = await getSourceDirs(packageDir);

      if (sourceDirs.length === 0) {
        continue; // Skip packages without source directories
      }

      // Validate files in each source directory
      for (const { path: sourcePath, basePath } of sourceDirs) {
        const violations = await getAllFiles(sourcePath, basePath, packageName);
        allViolations.push(...violations);
      }
    }

    if (allViolations.length === 0) {
      console.log(
        "✅ All files and directories follow kebab-case naming convention"
      );
      process.exit(0);
    } else {
      console.log("❌ Found naming convention violations:");
      console.log("");

      allViolations.forEach(({ path, type, name }) => {
        console.log(`  ${type === "directory" ? "📁" : "📄"} ${path}`);
        console.log(
          `     Expected: ${name
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "-")
            .replace(/-+/g, "-")
            .replace(/^-|-$/g, "")}`
        );
        console.log("");
      });

      console.log(
        "💡 All files and directories must follow kebab-case naming:"
      );
      console.log("   - Use lowercase letters and numbers only");
      console.log("   - Separate words with hyphens (-)");
      console.log(
        "   - Examples: user-profile.tsx, api-client.ts, course-list.page.tsx"
      );
      console.log("");

      process.exit(1);
    }
  } catch (error) {
    console.error("❌ Error validating kebab-case:", error.message);
    process.exit(1);
  }
}

// Run validation
validateKebabCase();
