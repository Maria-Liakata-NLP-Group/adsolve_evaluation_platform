/** @format */

// utils/loadJsonFolder.js (or inline)
export function loadAllJsonInFolder(subdir = "", fileName = "") {
	// 1) Grab ALL json files under ../data/*/ at build time
	const modules = import.meta.glob("../data/*/*.json", {
		eager: true,
		import: "default",
	});

	// Add trailing slash if needed
	subdir = subdir ? subdir + "/" : "";

	// 2) Keep only the ones inside the requested subfolder
	const prefix = `../data/${subdir}${fileName || ""}`; // e.g. "../data/foo/"

	console.log(prefix);

	return Object.entries(modules)
		.filter(([path]) => path.startsWith(prefix))
		.map(([path, json]) => ({
			path,
			data: json,
			// optional helpers:
			file: path.slice(prefix.length), // e.g. "foo.json"
			slug: path.slice(prefix.length).replace(/\.json$/, ""), // e.g. "foo"
		}));
}
