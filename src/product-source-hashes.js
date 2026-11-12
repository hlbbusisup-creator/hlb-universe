// Reviewed PDF editions and the individual products and pictures checked against them.
// npm run review:products prints these measurements when preparing a new edition.
globalThis.HLBProductEditions = {
  ko: {
    source: "9df5b959f74794dff4a79fb658385f41997203ca407842daafb8601a096ee030",
    preview: "c5cd8fa481818db1efb54f9f884333c120b345b54dad4a36b8bea52af23fa734",
    products: 384, withPhotos: 352, withDescription: 383, withPrice: 274
  },
  en: {
    source: "978075da693ac03287b12fb296c3a2fd206957f06437e8496cb691bc556e5e59",
    preview: "129fc4e3eed2b25283b233325af6339ce7931361b921336a501730a6b753d2d3",
    products: 384, withPhotos: 352, withDescription: 383, withPrice: 274
  }
};
globalThis.HLBProductSourceHashes = Object.fromEntries(
  Object.entries(globalThis.HLBProductEditions).map(([language, edition]) => [language, edition.source])
);
