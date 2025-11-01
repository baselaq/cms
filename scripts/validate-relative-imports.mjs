#!/usr/bin/env node

import { readdir, readFile, stat, access } from "fs/promises";
import { join, extname } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Pattern to detect relative imports with multiple ../
const MULTIPLE_RELATIVE_PATTERN = /from\s+['"](\.\.(\/\.\.)+[^'"]*)['"]/g;
const IMPORT_MULTIPLE_RELATIVE_PATTERN =
  /import\s+[^'"]*from\s+['"](\.\.(\/\.\.)+[^'"]*)['"]/g;

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

async function getAllTsFiles(dir, basePath = "", packageName = "") {
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
        // Skip node_modules and other build directories
        if (
          ["node_modules", "dist", "build", ".git", ".husky"].includes(entry)
        ) {
          continue;
        }

        const subFiles = await getAllTsFiles(
          fullPath,
          relativePath,
          packageName
        );
        files.push(...subFiles);
      } else {
        const ext = extname(entry);
        if ([".ts", ".tsx", ".js", ".jsx"].includes(ext)) {
          files.push({ path: fullPath, relativePath: packageRelativePath });
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

function findRelativeImports(content, filePath) {
  const violations = [];

  // Find all matches for both patterns
  const matches = [
    ...Array.from(content.matchAll(MULTIPLE_RELATIVE_PATTERN)),
    ...Array.from(content.matchAll(IMPORT_MULTIPLE_RELATIVE_PATTERN)),
  ];

  for (const match of matches) {
    const importPath = match[1];
    const lineNumber = content.substring(0, match.index).split("\n").length;

    // Count the number of ../ segments
    const upLevels = (importPath.match(/\.\.\//g) || []).length;

    if (upLevels >= 2) {
      // Suggest alias based on the import path
      let suggestedAlias = "";

      if (importPath.includes("/core/")) {
        suggestedAlias = importPath.replace(/^(\.\.(\/\.\.)*\/)*/, "@/");
      } else if (importPath.includes("/shared/")) {
        suggestedAlias = importPath.replace(/^(\.\.(\/\.\.)*\/)*/, "@/");
      } else if (importPath.includes("/tenants/")) {
        suggestedAlias = importPath.replace(/^(\.\.(\/\.\.)*\/)*/, "@/");
      } else if (importPath.includes("/app/")) {
        suggestedAlias = importPath.replace(/^(\.\.(\/\.\.)*\/)*/, "@/");
      } else {
        suggestedAlias = importPath.replace(/^(\.\.(\/\.\.)*\/)*/, "@/");
      }

      violations.push({
        file: filePath,
        line: lineNumber,
        importPath,
        upLevels,
        suggestion: suggestedAlias,
        fullMatch: match[0],
      });
    }
  }

  return violations;
}

async function validateRelativeImports() {
  try {
    const projectRoot = join(__dirname, "..");
    const packagesDir = join(projectRoot, "packages");

    console.log("🔍 Validating relative imports across packages...");

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
        const tsFiles = await getAllTsFiles(sourcePath, basePath, packageName);

        for (const { path, relativePath } of tsFiles) {
          try {
            const content = await readFile(path, "utf-8");
            const fileViolations = findRelativeImports(content, relativePath);
            allViolations.push(...fileViolations);
          } catch (error) {
            console.warn(
              `⚠️  Could not read file ${relativePath}: ${error.message}`
            );
          }
        }
      }
    }

    if (allViolations.length === 0) {
      console.log(
        "✅ All imports use proper aliases (no multiple ../.. patterns)"
      );
      process.exit(0);
    } else {
      console.log("❌ Found relative import violations:");
      console.log("");

      allViolations.forEach(
        ({ file, line, importPath, upLevels, suggestion, fullMatch }) => {
          console.log(`  📄 ${file}:${line}`);
          console.log(`     Import: ${importPath}`);
          console.log(`     Levels up: ${upLevels}`);
          console.log(`     Suggestion: ${suggestion}`);
          console.log(`     Full match: ${fullMatch}`);
          console.log("");
        }
      );

      console.log("💡 Import guidelines:");
      console.log("   - Use @/ alias instead of multiple ../.. patterns");
      console.log("   - Maximum one level up (../) is acceptable");
      console.log("   - Examples:");
      console.log("     ❌ from '../../../core/config/types'");
      console.log("     ✅ from '@/core/config/types'");
      console.log("     ❌ from '../../../../shared/components/ui/button'");
      console.log("     ✅ from '@/shared/components/ui/button'");
      console.log("");

      process.exit(1);
    }
  } catch (error) {
    console.error("❌ Error validating relative imports:", error.message);
    process.exit(1);
  }
}

// Run validation
validateRelativeImports();
