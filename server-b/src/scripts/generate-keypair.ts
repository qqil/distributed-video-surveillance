import { generateKeyPair, exportPKCS8, exportSPKI } from "jose";

async function generate() {
  const keyPair = await generateKeyPair("RS256", { extractable: true });

  console.log(await exportPKCS8(keyPair.privateKey));
  console.log(await exportSPKI(keyPair.publicKey));
}

generate().catch((err) => {
  console.error(err);
});
