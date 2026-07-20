// ============================================================
// Base File I/O utilities for JSON data storage
// All data access goes through /lib/data/ service functions
// ============================================================
import { promises as fs } from "fs";
import path from "path";

// Root data directory (outside src)
export const DATA_DIR = path.join(process.cwd(), "data");

/**
 * Read a JSON file and parse it. Returns null if file doesn't exist.
 */
export async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/**
 * Write data to a JSON file (creates parent dirs if needed).
 */
export async function writeJsonFile<T>(
  filePath: string,
  data: T
): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
}

/**
 * Read all JSON files from a directory. Returns array of parsed objects.
 */
export async function readAllJsonFromDir<T>(dirPath: string): Promise<T[]> {
  try {
    await fs.mkdir(dirPath, { recursive: true });
    const files = await fs.readdir(dirPath);
    const jsonFiles = files.filter((f) => f.endsWith(".json"));
    const results = await Promise.all(
      jsonFiles.map(async (f) => {
        const filePath = path.join(dirPath, f);
        return readJsonFile<T>(filePath);
      })
    );
    return results.filter((r) => r !== null) as T[];
  } catch {
    return [];
  }
}

/**
 * Delete a JSON file.
 */
export async function deleteJsonFile(filePath: string): Promise<boolean> {
  try {
    await fs.unlink(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a file exists.
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
