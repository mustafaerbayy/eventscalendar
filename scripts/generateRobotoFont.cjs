const fs = require("fs");
const path = require("path");
const { toSfnt } = require("woff2sfnt-sfnt2woff");

async function main() {
  const regWoff = fs.readFileSync(
    path.join(__dirname, "../node_modules/roboto-fontface/fonts/roboto/Roboto-Regular.woff")
  );
  const boldWoff = fs.readFileSync(
    path.join(__dirname, "../node_modules/roboto-fontface/fonts/roboto/Roboto-Bold.woff")
  );

  // Convert WOFF to SFNT (TTF)
  const regTtf = Buffer.from(await toSfnt(regWoff));
  const boldTtf = Buffer.from(await toSfnt(boldWoff));

  console.log("Regular TTF size:", regTtf.length);
  console.log("Bold TTF size:", boldTtf.length);

  const regB64 = regTtf.toString("base64");
  const boldB64 = boldTtf.toString("base64");

  const outDir = path.join(__dirname, "../src/lib");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const lines = [
    "// Auto-generated Roboto TTF (converted from WOFF) – do not edit manually",
    "// Used by jsPDF for PDF generation with Turkish character support",
    "export const robotoRegularB64 =",
    JSON.stringify(regB64) + ";",
    "export const robotoBoldB64 =",
    JSON.stringify(boldB64) + ";",
  ];

  fs.writeFileSync(path.join(outDir, "robotoFont.ts"), lines.join("\n") + "\n");
  console.log("✅ robotoFont.ts generated successfully!");
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
