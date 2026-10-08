import fs from "fs";
import path from "path";

let cache;

export function getLocalUsers() {
  if (cache) return cache;

  try {
    const csvPath = path.join(process.cwd(), "data", "Team Logins Simple.csv");
    const text = fs.readFileSync(csvPath, "utf8");
    const lines = text.trim().split(/\r?\n/).slice(1);

    cache = lines
      .map((line) => {
        const [teamName, username, password] = line.split(",");
        return {
          teamName: teamName?.trim(),
          username: username?.trim(),
          password: password?.trim(),
          balance: 10000,
          stocks: [],
        };
      })
      .filter((user) => user.username && user.password);
  } catch {
    cache = [];
  }

  return cache;
}

export function findLocalUser(username) {
  return getLocalUsers().find((user) => user.username === username) || null;
}
