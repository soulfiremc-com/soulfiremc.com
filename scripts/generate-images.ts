import { Effect } from "effect";
import { generateStaticImages } from "./lib/static-images";
import { printLine } from "./lib/output";

const result = await Effect.runPromise(
  generateStaticImages({
    publicDirectory: new URL("../public/", import.meta.url),
    metadataFile: new URL("../src/lib/image-metadata.json", import.meta.url),
  }),
);
printLine(
  `Generated ${result.variants} static image variants for ${result.images} images.`,
);
