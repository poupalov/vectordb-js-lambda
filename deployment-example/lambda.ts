import * as LanceDB from "vectordb";

export async function testVectorDbImport() {
  console.log("HELLO WORLD!");
  // Dummy check to make sure `vectordb` is imported
  console.log(LanceDB.connect);
  console.log("GOODBYE WORLD!");
}
