#!/usr/bin/env node

import { readdir, readFile, stat, access } from "fs/promises";
import { join, extname } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// TypeScript naming patterns
const NAMING_PATTERNS = {
  // Component props interfaces
  COMPONENT_PROPS: /^I[A-Z][A-Za-z0-9]*Props$/,

  // Function parameter interfaces
  FUNCTION_PARAMS: /^I[A-Z][A-Za-z0-9]*Params$/,

  // Function return interfaces
  FUNCTION_RETURN: /^I[A-Z][A-Za-z0-9]*Return$/,

  // API request interfaces
  API_REQUEST: /^I[A-Z][A-Za-z0-9]*Request$/,

  // API response interfaces
  API_RESPONSE: /^I[A-Z][A-Za-z0-9]*Response$/,

  // Custom hook parameter interfaces
  HOOK_PARAMS: /^IUse[A-Z][A-Za-z0-9]*Params$/,

  // Custom hook return interfaces
  HOOK_RETURN: /^IUse[A-Z][A-Za-z0-9]*Return$/,

  // General interface pattern (must start with I)
  GENERAL_INTERFACE: /^I[A-Z][A-Za-z0-9]*$/,
};

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
        if ([".ts", ".tsx"].includes(ext)) {
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

function extractExportedInterfaces(content) {
  const interfaces = [];

  // Match exported interfaces and types
  const interfaceRegex = /export\s+interface\s+([A-Za-z0-9_]+)/g;
  const typeRegex = /export\s+type\s+([A-Za-z0-9_]+)/g;

  let match;

  // Extract interfaces
  while ((match = interfaceRegex.exec(content)) !== null) {
    interfaces.push({
      name: match[1],
      type: "interface",
      line: content.substring(0, match.index).split("\n").length,
    });
  }

  // Extract types
  while ((match = typeRegex.exec(content)) !== null) {
    interfaces.push({
      name: match[1],
      type: "type",
      line: content.substring(0, match.index).split("\n").length,
    });
  }

  return interfaces;
}

function isReactComponent(content) {
  // Check if file exports a React component
  const componentPatterns = [
    /export\s+default\s+function\s+[A-Z]/,
    /export\s+function\s+[A-Z][A-Za-z0-9]*\s*\(/,
    /const\s+[A-Z][A-Za-z0-9]*\s*[:=]\s*\(/,
    /function\s+[A-Z][A-Za-z0-9]*\s*\(/,
  ];

  return componentPatterns.some((pattern) => pattern.test(content));
}

function isCustomHook(content) {
  // Check if file exports custom hooks (functions starting with 'use')
  const hookPatterns = [
    /export\s+function\s+use[A-Z]/,
    /const\s+use[A-Z][A-Za-z0-9]*\s*[:=]/,
  ];

  return hookPatterns.some((pattern) => pattern.test(content));
}

function validateInterfaceName(interfaceName, context) {
  // All interfaces must start with 'I'
  if (!interfaceName.startsWith("I")) {
    return {
      valid: false,
      reason: 'Interface names must start with "I"',
      suggestion: `I${interfaceName}`,
    };
  }

  // Check specific patterns based on context
  if (context.isComponent && interfaceName.endsWith("Props")) {
    if (!NAMING_PATTERNS.COMPONENT_PROPS.test(interfaceName)) {
      return {
        valid: false,
        reason:
          "Component props interfaces must follow pattern: I<ComponentName>Props",
        suggestion: `I${interfaceName
          .replace(/^I/, "")
          .replace(/Props$/, "")}Props`,
      };
    }
  }

  if (context.isHook) {
    if (
      interfaceName.includes("Params") &&
      !NAMING_PATTERNS.HOOK_PARAMS.test(interfaceName)
    ) {
      return {
        valid: false,
        reason:
          "Hook parameter interfaces must follow pattern: IUse<HookName>Params",
      };
    }

    if (
      interfaceName.includes("Return") &&
      !NAMING_PATTERNS.HOOK_RETURN.test(interfaceName)
    ) {
      return {
        valid: false,
        reason:
          "Hook return interfaces must follow pattern: IUse<HookName>Return",
      };
    }
  }

  if (
    interfaceName.endsWith("Request") &&
    !NAMING_PATTERNS.API_REQUEST.test(interfaceName)
  ) {
    return {
      valid: false,
      reason: "API request interfaces must follow pattern: I<ApiName>Request",
    };
  }

  if (
    interfaceName.endsWith("Response") &&
    !NAMING_PATTERNS.API_RESPONSE.test(interfaceName)
  ) {
    return {
      valid: false,
      reason: "API response interfaces must follow pattern: I<ApiName>Response",
    };
  }

  // General interface pattern check
  if (!NAMING_PATTERNS.GENERAL_INTERFACE.test(interfaceName)) {
    return {
      valid: false,
      reason: 'Interface names must follow PascalCase and start with "I"',
    };
  }

  return { valid: true };
}

async function validateTsNaming() {
  try {
    const projectRoot = join(__dirname, "..");
    const packagesDir = join(projectRoot, "packages");

    console.log(
      "🔍 Validating TypeScript naming conventions across packages..."
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
        const tsFiles = await getAllTsFiles(sourcePath, basePath, packageName);

        for (const { path, relativePath } of tsFiles) {
          try {
            const content = await readFile(path, "utf-8");
            const interfaces = extractExportedInterfaces(content);

            if (interfaces.length === 0) continue;

            const context = {
              isComponent: isReactComponent(content),
              isHook: isCustomHook(content),
            };

            for (const interfaceInfo of interfaces) {
              const validation = validateInterfaceName(
                interfaceInfo.name,
                context
              );

              if (!validation.valid) {
                allViolations.push({
                  file: relativePath,
                  interface: interfaceInfo.name,
                  line: interfaceInfo.line,
                  type: interfaceInfo.type,
                  reason: validation.reason,
                  suggestion: validation.suggestion,
                });
              }
            }
          } catch (error) {
            console.warn(
              `⚠️  Could not parse file ${relativePath}: ${error.message}`
            );
          }
        }
      }
    }

    if (allViolations.length === 0) {
      console.log("✅ All TypeScript interfaces follow naming conventions");
      process.exit(0);
    } else {
      console.log("❌ Found TypeScript naming convention violations:");
      console.log("");

      allViolations.forEach(
        ({
          file,
          interface: interfaceName,
          line,
          type,
          reason,
          suggestion,
        }) => {
          console.log(`  📄 ${file}:${line}`);
          console.log(`     ${type}: ${interfaceName}`);
          console.log(`     Issue: ${reason}`);
          if (suggestion) {
            console.log(`     Suggestion: ${suggestion}`);
          }
          console.log("");
        }
      );

      console.log("💡 TypeScript naming conventions:");
      console.log('   - All interfaces must start with "I"');
      console.log("   - Component props: I<ComponentName>Props");
      console.log("   - Function params: I<FunctionName>Params");
      console.log("   - Function returns: I<FunctionName>Return");
      console.log("   - API requests: I<ApiName>Request");
      console.log("   - API responses: I<ApiName>Response");
      console.log("   - Hook params: IUse<HookName>Params");
      console.log("   - Hook returns: IUse<HookName>Return");
      console.log("");

      process.exit(1);
    }
  } catch (error) {
    console.error("❌ Error validating TypeScript naming:", error.message);
    process.exit(1);
  }
}

// Run validation
validateTsNaming();
