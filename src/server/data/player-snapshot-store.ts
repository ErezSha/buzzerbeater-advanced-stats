import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { PlayerScoutingSnapshot } from "@/domain/types";

interface SnapshotFile {
  players: Record<string, PlayerScoutingSnapshot[]>;
}

export interface PlayerSnapshotStore {
  readLatest(playerId: string): Promise<PlayerScoutingSnapshot | null>;
  append(playerId: string, snapshot: PlayerScoutingSnapshot): Promise<void>;
}

export interface CreatePlayerSnapshotStoreOptions {
  filePath?: string;
}

export function createPlayerSnapshotStore(
  options: CreatePlayerSnapshotStoreOptions = {},
): PlayerSnapshotStore {
  const filePath =
    options.filePath ?? join(process.cwd(), ".cache", "player-scouting.json");

  return {
    async readLatest(playerId) {
      const data = await readSnapshotFile(filePath);
      const entries = data.players[playerId] ?? [];
      return entries.at(-1) ?? null;
    },

    async append(playerId, snapshot) {
      const data = await readSnapshotFile(filePath);
      const entries = data.players[playerId] ?? [];
      data.players[playerId] = [...entries, snapshot];
      await writeSnapshotFile(filePath, data);
    },
  };
}

async function readSnapshotFile(filePath: string): Promise<SnapshotFile> {
  try {
    const input = await readFile(filePath, "utf8");
    const parsed = JSON.parse(input) as Partial<SnapshotFile> | null;
    return {
      players: parsed?.players ?? {},
    };
  } catch {
    return { players: {} };
  }
}

async function writeSnapshotFile(
  filePath: string,
  data: SnapshotFile,
): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(data, null, 2), "utf8");
}
