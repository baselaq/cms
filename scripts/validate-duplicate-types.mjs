#!/usr/bin/env node
import ts from "typescript";
import fg from "fast-glob";
import fs from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Packages to validate
const PACKAGES = ["backend", "web", "mobile", "shared"];

// Common source directory names
const SOURCE_DIRS = ["src", "app", "lib"];

console.log(
  "👁️  Checking for duplicate interfaces and types across packages..."
);

// Get shape of an interface
const getInterfaceShape = (node) => {
  const shape = {};

  // Add heritage clause info (extends)
  const heritage = node.heritageClauses
    ? node.heritageClauses.map((c) => c.getText()).join("|")
    : "";
  if (heritage) {
    shape["__extends__"] = heritage;
  }

  node.members.forEach((member) => {
    if (
      ts.isPropertySignature(member) &&
      member.name &&
      ts.isIdentifier(member.name) &&
      member.type
    ) {
      const key = member.name.text;
      const isOptional = !!member.questionToken;
      const type = member.type.getText();
      shape[key] = `${type}${isOptional ? "?" : ""}`;
    } else if (ts.isIndexSignatureDeclaration(member) && member.type) {
      // Handle index signatures like [key: string]: type
      const paramType = member.parameters[0]?.type?.getText() || "unknown";
      const valueType = member.type.getText();
      shape[`[index:${paramType}]`] = valueType;
    }
  });
  return shape;
};

// Get shape of a type alias
const getTypeShape = (node) => {
  if (!node.type) return null;

  // For type literals (object types)
  if (ts.isTypeLiteralNode(node.type)) {
    const shape = {};
    node.type.members.forEach((member) => {
      if (
        ts.isPropertySignature(member) &&
        member.name &&
        ts.isIdentifier(member.name) &&
        member.type
      ) {
        const key = member.name.text;
        const isOptional = !!member.questionToken;
        const type = member.type.getText();
        shape[key] = `${type}${isOptional ? "?" : ""}`;
      } else if (ts.isIndexSignatureDeclaration(member) && member.type) {
        const paramType = member.parameters[0]?.type?.getText() || "unknown";
        const valueType = member.type.getText();
        shape[`[index:${paramType}]`] = valueType;
      }
    });
    return shape;
  }

  // For union types, intersection types, and other type expressions
  // We'll use the full type text as the shape
  return { __typeExpression__: node.type.getText() };
};

const shapeToKey = (shape) =>
  Object.entries(shape)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${v}`)
    .join("|");

// Helper function to find source directories in a package
function findSourceDirs(packageDir) {
  const sourceDirs = [];
  for (const dir of SOURCE_DIRS) {
    const dirPath = join(packageDir, dir);
    if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
      sourceDirs.push(dir);
    }
  }
  return sourceDirs;
}

// Collect all TypeScript files from all packages
const projectRoot = join(__dirname, "..");
const packagesDir = join(projectRoot, "packages");

const allFiles = [];

for (const packageName of PACKAGES) {
  const packageDir = join(packagesDir, packageName);

  if (!fs.existsSync(packageDir)) {
    continue;
  }

  const sourceDirs = findSourceDirs(packageDir);

  if (sourceDirs.length === 0) {
    continue; // Skip packages without source directories
  }

  // Find TypeScript files in each source directory
  for (const sourceDir of sourceDirs) {
    const pattern = join(packageDir, sourceDir, "**/*.{ts,tsx}").replace(
      /\\/g,
      "/"
    );
    const files = fg.sync(pattern, {
      ignore: ["**/node_modules/**", "**/dist/**", "**/build/**", "**/.git/**"],
    });

    // Store files with package context
    for (const file of files) {
      allFiles.push({
        path: file,
        package: packageName,
        relativePath: `packages/${packageName}/${file.replace(
          packageDir + "/",
          ""
        )}`,
      });
    }
  }
}

const seenInterfaceShapes = new Map(); // key = shape string, value = { name, file, package, relativePath }
const seenTypeShapes = new Map(); // key = shape string, value = { name, file, package, relativePath }

let hasDuplicates = false;

for (const { path: file, package: packageName, relativePath } of allFiles) {
  try {
    const source = ts.createSourceFile(
      file,
      fs.readFileSync(file, "utf8"),
      ts.ScriptTarget.Latest,
      true
    );

    ts.forEachChild(source, (node) => {
      // Check for duplicate interfaces
      if (ts.isInterfaceDeclaration(node)) {
        const name = node.name.text;
        const shape = getInterfaceShape(node);
        const shapeKey = shapeToKey(shape);

        if (seenInterfaceShapes.has(shapeKey)) {
          const existing = seenInterfaceShapes.get(shapeKey);

          // Allow duplicates if they are in different packages (cross-package duplication is acceptable)
          if (packageName !== existing.package) {
            // Update the existing entry to note cross-package duplicate
            seenInterfaceShapes.set(shapeKey, {
              ...existing,
              duplicateInPackage: packageName,
              duplicateFile: relativePath,
            });
          } else {
            // Same package - this is a real duplicate
            console.error(
              `❌ Duplicate interface "${name}" in ${relativePath}`
            );
            console.error(
              `   Same shape as interface "${existing.name}" in ${existing.relativePath}`
            );
            console.error(
              `   💡 Please reuse the existing interface or move it to a shared location.\n`
            );
            hasDuplicates = true;
          }
        } else {
          seenInterfaceShapes.set(shapeKey, {
            name,
            file,
            package: packageName,
            relativePath,
          });
        }
      }

      // Check for duplicate type aliases
      if (ts.isTypeAliasDeclaration(node)) {
        const name = node.name.text;
        const shape = getTypeShape(node);

        if (shape) {
          const shapeKey = shapeToKey(shape);

          if (seenTypeShapes.has(shapeKey)) {
            const existing = seenTypeShapes.get(shapeKey);

            // Allow duplicates if they are in different packages (cross-package duplication is acceptable)
            if (packageName !== existing.package) {
              // Update the existing entry to note cross-package duplicate
              seenTypeShapes.set(shapeKey, {
                ...existing,
                duplicateInPackage: packageName,
                duplicateFile: relativePath,
              });
            } else {
              // Same package - this is a real duplicate
              console.error(`❌ Duplicate type "${name}" in ${relativePath}`);
              console.error(
                `   Same shape as type "${existing.name}" in ${existing.relativePath}`
              );
              console.error(
                `   💡 Please reuse the existing type or move it to a shared location.\n`
              );
              hasDuplicates = true;
            }
          } else {
            seenTypeShapes.set(shapeKey, {
              name,
              file,
              package: packageName,
              relativePath,
            });
          }
        }
      }
    });
  } catch (error) {
    console.warn(`⚠️  Could not parse file ${relativePath}: ${error.message}`);
  }
}

if (hasDuplicates) {
  console.error("\n❌ Duplicate interfaces/types found!");
  console.error("\n💡 Tips to fix:");
  console.error(
    "   1. Move shared types to packages/shared or appropriate shared location"
  );
  console.error("   2. Reuse existing interfaces/types instead of duplicating");
  console.error(
    "   3. If types are intentionally different, rename them to be more specific"
  );
  console.error(
    "   4. Note: Duplicate types across different packages are allowed\n"
  );
  process.exit(1);
}

console.log("✅ No duplicate interfaces or types found within packages");
console.log(
  "ℹ️  Note: Duplicate interfaces/types across different packages are allowed"
);
