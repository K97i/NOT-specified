var chartdata;

let button = document.querySelector("#parseButton");
let titletext = document.querySelector("#titletext");

function setchartjsdef() {
	// Performance
	Chart.defaults.responsive = true;
	Chart.defaults.normalized = true;
	Chart.defaults.elements.point.radius = 0;

	Chart.defaults.maintainAspectRatio = false;

	// Font
	Chart.defaults.font.family = "'JetBrains Mono', monospace";

	// Interaction
	Chart.defaults.interaction.intersect = false;
	Chart.defaults.interaction.mode = "index";

	// Plugins
	Chart.defaults.plugins.title.display = true;
	Chart.defaults.plugins.legend.display = true;
	Chart.defaults.plugins.decimation.enabled = true;
}
setchartjsdef();

button.addEventListener("click", () => {
	titletext.textContent = "HWinfo Log Plotter";

	var input;
	let linkinput = document.querySelector("#linkinput");
	let fileinput = document.querySelector("#fileinput");

	if (!(fileinput.files.length == 0)) {
		input = [fileinput.files, "file"];
	} else if (!(linkinput.value == "")) {
		input = [linkinput.value, "link"];
	}

	parse(input);
});

function readTextFromBlob(blob) {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();

		reader.onload = () => {
			const text = reader.result;
			resolve(text);
		};

		reader.onerror = () => {
			reader.abort();
			reject(new Error("Error reading blob"));
		};

		reader.readAsText(blob);
	});
}

function csvToObj(csv) {
	const lines = csv
		.replaceAll('"', "")
		.replaceAll("�", "degrees ")
		.split("\n")
		.slice(0, -3);
	const headers = lines[0].split(",").slice(0, -1);

	const result = [];

	for (let i = 1; i < lines.length; i++) {
		const currentLine = lines[i].split(",");
		const obj = {};

		for (let j = 0; j < headers.length; j++) {
			var gpucount = 1;
			if (headers[j].includes("GPU")) {
				if (obj[`${gpucount} - ` + headers[j]]) {
					gpucount++;
				}
				obj[`${gpucount} - ` + headers[j]] = currentLine[j];
				continue;
			}
			obj[headers[j]] = currentLine[j];
		}

		result.push(obj);
	}

	const sorted = {};

	result.forEach((obj) => {
		Object.entries(obj).forEach(([key, value]) => {
			if (!sorted[key]) {
				sorted[key] = [];
			}
			if (!isNaN(value)) {
				var num = Number(value);
				sorted[key].push(num);
			} else {
				if (key == "Date") {
					value = value.replaceAll(".", "/");
				}
				sorted[key].push(value);
			}
		});
	});

	const timeDiffs = [];

	var times = [];
	for (var date in sorted["Date"]) {
		times.push(`${sorted["Date"][date]} ${sorted["Time"][date]}`);
	}

	function getfirsttime() {
		var rtime = times[0].split(" ");
		var date = rtime[0].split("/");
		rtime = rtime[1].split(":");
		return new Date(
			date[2],
			date[1],
			date[0],
			rtime[0],
			rtime[1],
			rtime[2]
		);
	}

	let firsttime = getfirsttime();

	for (var time in sorted["Date"]) {
		var rtime = times[time].split(" ");
		var date = rtime[0].split("/");
		rtime = rtime[1].split(":");

		var currentTime = new Date(
			date[2],
			date[1],
			date[0],
			rtime[0],
			rtime[1],
			rtime[2]
		);

		var inseconds = Math.round((currentTime - firsttime) / 1000);
		var date = new Date(null);
		date.setSeconds(inseconds);

		timeDiffs.push(date.toISOString().substr(14, 5));
	}
	sorted["Time"] = timeDiffs;

	return sorted;
}

async function parse(data) {
	document.querySelector("#loading").style.display = "block";
	document.querySelector("#linkinput").disabled = true;

	if (!Boolean(data)) {
		titletext.textContent = "No File Selected!";
		return;
	} else if (data[1] == "link") {
		await fetch(
			"https://api.allorigins.win/raw?url=" + encodeURIComponent(data[0])
		)
			.then((response) => response.blob())
			.then((blob) => {
				console.log(blob);

				if (!(blob["type"].indexOf("text/csv") >= 0)) {
					titletext.textContent = "Not a CSV!";
					data = "";
					return;
				}
				const file = new File([blob], "foobar.csv");
				const dataTransfer = new DataTransfer();
				dataTransfer.items.add(file);
				data = dataTransfer.files;
			});
	} else {
		if (
			!(
				data[0][0]["type"].indexOf("text/csv") >= 0 ||
				data[0][0]["type"].indexOf("application/vnd.ms-excel") >= 0
			)
		) {
			titletext.textContent = "Not a CSV!";
			data = "";
			return;
		}
		const file = new File(data[0], "foobar.csv");
		const dataTransfer = new DataTransfer();
		dataTransfer.items.add(file);
		data = dataTransfer.files;
	}

	if (!Boolean(data)) {
		return;
	}

	data = await readTextFromBlob(data[0]);

	data = csvToObj(data);

	document.querySelector("#loading").style.opacity = 0;
	setTimeout(() => {
		document.querySelector("#loading").style.visibility = "hidden";
	}, "500");

	document.querySelector("#linkinput").disabled = false;

	document.querySelector("#dataGet").style.opacity = 0;
	setTimeout(() => {
		document.querySelector("#dataGet").style.visibility = "hidden";
	}, "500");

	document.querySelector("#graphs").style.visibility = "visible";
	document.querySelector("#graphs").style.opacity = 1;

	document.querySelector("#customgraphs").style.visibility = "visible";
	document.querySelector("#customgraphs").style.opacity = 1;

	chartdata = data;

	graph_default();
}

function graph_default() {
	console.log("Parsing Success! Good job K9!");
	console.log(chartdata);

	generateCPU();
	generateGPU();
	generateCustom();
}

function generateCPU() {
	var coreClocks = [];
	var coreEffectiveClocks = [];

	for (var key in chartdata) {
		// Core Clocks
		if (key.match(/^Core (\d+) Clock.*\[MHz]$/)) {
			var data = {
				label: key,
				data: chartdata[key],
				borderWidth: 1,
				spanGaps: true,
				hidden: true,
			};
			coreClocks.push(data);
		}

		// Core Effective Clocks
		if (key.match(/Core (\d+) T(\d+) Effective Clock \[MHz\]/)) {
			var data = {
				label: key,
				data: chartdata[key],
				borderWidth: 1,
				spanGaps: true,
				hidden: true,
			};
			coreEffectiveClocks.push(data);
		}
	}

	coreClocks.push({
		label: "Core Clocks (avg) [MHz]",
		data: chartdata["Core Clocks (avg) [MHz]"],
		borderWidth: 1,
	});

	coreEffectiveClocks.push({
		label: "Core Effective Clocks (avg) [MHz]",
		data: chartdata["Core Effective Clocks (avg) [MHz]"],
		borderWidth: 1,
	});

	var coreClocksChart = new Chart("coreClocks", {
		type: "line",
		data: {
			labels: chartdata["Time"],
			datasets: coreClocks,
		},
		plugins: {
			title: {
				text: "Core Clocks [MHz]",
			},
		},
	});

	var coreEffectiveClocksChart = new Chart("coreEffectiveClocks", {
		type: "line",
		data: {
			labels: chartdata["Time"],
			datasets: coreEffectiveClocks,
		},
		plugins: {
			title: {
				text: "Core Effective Clocks [MHz]",
			},
		},
	});

	var coreTemps = new Chart("coreTemps", {
		type: "line",
		data: {
			labels: chartdata["Time"],
			datasets: [
				{
					label: "Core Temperatures (avg) [degrees C]",
					data: chartdata["Core Temperatures (avg) [degrees C]"],
					borderWidth: 1,
				},
			],
		},
		plugins: {
			title: {
				text: "Core Temperatures (avg) [degrees C]",
			},
		},
	});

	var coreVIDs = new Chart("coreVIDs", {
		type: "line",
		data: {
			labels: chartdata["Time"],
			datasets: [
				{
					label: "Core VIDs (avg) [V]",
					data: chartdata["Core VIDs (avg) [V]"],
					borderWidth: 1,
				},
			],
		},
		plugins: {
			title: {
				text: "Core VIDs (avg) [V] / Ratio (avg) [x]",
			},
		},
	});
}

function generateGPU() {
	var gpuClocks = [];
	var gpuUsage = [];
	var gpuTemps = [];
	var gpuMem = [];

	for (var key in chartdata) {
		// GPU Clocks
		if (key.match(/GPU(.*)?Clock \[MHz\]/)) {
			var data = {
				label: key,
				data: chartdata[key],
				borderWidth: 1,
				spanGaps: true,
			};
			gpuClocks.push(data);
		}

		// GPU Usage
		if (key.match(/GPU(.*)?Load \[%\]/i)) {
			var data = {
				label: key,
				data: chartdata[key],
				borderWidth: 1,
				spanGaps: true,
			};
			gpuUsage.push(data);
		}

		// GPU Temps
		if (key.match(/GPU(.*)?\[degrees C\]/i)) {
			var data = {
				label: key,
				data: chartdata[key],
				borderWidth: 1,
				spanGaps: true,
			};
			gpuTemps.push(data);
		}

		// GPU Memory
		if (key.match(/GPU(.*)?\[MB\]/i)) {
			var data = {
				label: key,
				data: chartdata[key],
				borderWidth: 1,
				spanGaps: true,
			};
			gpuMem.push(data);
		}
	}
	console.log(gpuClocks);
	console.log(gpuUsage);

	var gpuClocksChart = new Chart("gpuClocks", {
		type: "line",
		data: {
			labels: chartdata["Time"],
			datasets: gpuClocks,
		},
		plugins: {
			title: {
				text: "GPU Clocks [MHz]",
			},
		},
	});

	var gpuUsageChart = new Chart("gpuUsage", {
		type: "line",
		data: {
			labels: chartdata["Time"],
			datasets: gpuUsage,
		},
		plugins: {
			title: {
				text: "GPU Utilization [%]",
			},
		},
	});

	var gpuTempsChart = new Chart("gpuTemps", {
		type: "line",
		data: {
			labels: chartdata["Time"],
			datasets: gpuTemps,
		},
		plugins: {
			title: {
				text: "GPU Temps [degrees C]",
			},
		},
	});

	var gpuMemChart = new Chart("gpuMem", {
		type: "line",
		data: {
			labels: chartdata["Time"],
			datasets: gpuMem,
		},
		plugins: {
			title: {
				text: "GPU Memory [MB]",
			},
		},
	});
}

function generateCustom() {
	// the div itself
	var div = document.createElement("div");

	div.style.height = "400px";
	div.style.width = "100%";
	div.style.display = "inline-block";

	// canvas
	var canvas = document.createElement("canvas");

	canvas.id = "customgraph";
	canvas.ariaLabel = "Custom Graph";
	canvas.role = "img";

	// select
	var select = document.createElement("select");

	select.id = "cgraphselect";
	select.style.fontSize = "x-small";

	for (var key in chartdata) {
		var option = document.createElement("option");

		option.value = key;
		option.textContent = key;

		select.append(option);
	}

	div.append(select);
	div.append(canvas);
	document.querySelector("#cgraphcontainer").append(div);

	var key = "Virtual Memory Committed [MB]";

	var customgraphChart = new Chart("customgraph", {
		type: "line",
		data: {
			labels: chartdata["Time"],
			datasets: [],
		},
		plugins: {
			title: {
				text: "Custom Graph",
			},
		},
	});

	/* customgraphChart.data.datasets.push({
		label: document.querySelector("#cgraphselect").value,
		data: chartdata[document.querySelector("#cgraphselect").value],
		borderWidth: 1,
	});

	customgraphChart.update(); */
}
