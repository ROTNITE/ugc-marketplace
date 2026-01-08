import { execSync } from "node:child_process";

try {
  execSync("docker --version", { stdio: "ignore" });
} catch {
  console.error(
    "Docker не найден. Установите Docker Desktop и включите WSL integration (если вы в WSL).",
  );
  process.exit(1);
}
