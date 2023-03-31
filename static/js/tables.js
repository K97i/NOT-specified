import {
	Tabulator,
	ResponsiveLayoutModule,
	FilterModule,
	SortModule,
	TooltipModule,
	PageModule,
} from "https://cdn.jsdelivr.net/npm/tabulator-tables@5.4.4/dist/js/tabulator_esm.min.js";

Tabulator.registerModule([
	ResponsiveLayoutModule,
	FilterModule,
	SortModule,
	TooltipModule,
	PageModule,
]);

var pageamount = 20;

// Get profile name from DOM
const filename =
	"files/" + document.getElementById("filename").innerText + ".json";

// Get JSON data and parse
const json = await (await fetch(filename)).json();

// Running Processes
window.DrawRunProc = async function DrawRunProc() {
	let groupProcesses = {};
	json.System.RunningProcesses.forEach((e) => {
		const isSystemOrNull =
			e.ExePath === "Not Found" ||
			e.ExePath === "SYSTEM" ||
			e.ExePath.startsWith(null);
		const keys = Object.keys(groupProcesses);
		// the path is not valid if isSystemOrNull is true
		if (isSystemOrNull) {
			if (!keys.includes(e.ProcessName))
				groupProcesses[e.ProcessName] = [e];
			else groupProcesses[e.ProcessName].push(e);
		} else {
			if (!keys.includes(e.ExePath)) groupProcesses[e.ExePath] = [e];
			else groupProcesses[e.ExePath].push(e);
		}
	});

	const displayProcesses = Object.values(groupProcesses).flatMap((e) => {
		const count = e.length;
		const workingSetReal = e
			.map((p) => p.WorkingSet)
			.reduce((acc, cur) => acc + cur);
		const intl = Intl.NumberFormat("en-US");
		const workingSetMegaBytes = (workingSetReal / Math.pow(2, 20)).toFixed(
			2
		);
		const workingSetDisplay = intl.format(workingSetMegaBytes);
		const cpuPercent = e
			.map((p) => p.CpuPercent)
			.reduce((acc, cur) => acc + cur);
		return {
			ProcessName: `${e[0].ProcessName} (${count})`,
			ExePath: e[0].ExePath,
			Id: e[0].Id, // We can perhaps make this a list later
			WorkingSet: workingSetDisplay,
			CpuPercent: cpuPercent,
			WorkingSetReal: workingSetReal,
		};
	});

	var RunnProc = await new Tabulator("#runningProcesses", {
		data: displayProcesses, //load row data from array
		layout: "fitColumns", //fit columns to width of table
		responsiveLayout: "hide", //hide columns that dont fit on the table
		pagination: "local", //paginate the data
		paginationSize: pageamount, //allow 10 rows per page of data
		paginationButtonCount: 99, // Show all pages
		paginationCounter: "rows", //display count of paginated rows in footer
		initialSort: [
			//set the initial sort order of the data
			{ column: "ProcessName", dir: "asc" },
		],
		columnDefaults: {
			tooltip: true, //show tool tips on cells
		},
		columns: [
			//define the table columns
			{
				title: "ID",
				field: "Id",
				width: 100,
			},
			{
				title: "Process Name",
				field: "ProcessName",
				width: 500,
			},
			{
				title: "Path",
				field: "ExePath",
			},
			{
				title: "RAM (MB)",
				field: "WorkingSet",
				width: 100,
			},
			{
				title: "CPU",
				field: "CpuPercent",
				width: 100,
			},
		],
	});
};

// Installed Apps
window.DrawInstApps = async function DrawInstApps() {
	var InstApps = await new Tabulator("#installedApp", {
		data: json.System.InstalledApps, //load row data from array
		layout: "fitColumns", //fit columns to width of table
		responsiveLayout: "hide", //hide columns that dont fit on the table
		pagination: "local", //paginate the data
		paginationSize: pageamount, //allow 10 rows per page of data
		paginationButtonCount: 99, // Show all pages
		paginationCounter: "rows", //display count of paginated rows in footer
		initialSort: [
			//set the initial sort order of the data
			{ column: "Name", dir: "asc" },
		],
		columnDefaults: {
			tooltip: true, //show tool tips on cells
		},
		columns: [
			//define the table columns
			{
				title: "Name",
				field: "Name",
			},
			{
				title: "Version",
				field: "Version",
			},
			{
				title: "Install Date",
				field: "InstallDate",
			},
		],
	});
};

function FixDriveData(a) {
	const btomb = 1048576;
	a.Partitions.forEach((partition) => {
		partition.PartitionFree = Math.floor(partition.PartitionFree / btomb);
		partition.PartitionCapacity = Math.floor(
			partition.PartitionCapacity / btomb
		);
	});

	a.DiskCapacity = Math.floor(a.DiskCapacity / 1073741824);
	a.DiskFree = Math.floor(a.DiskFree / 1073741824);

	a = [
		{
			DeviceName: a.DeviceName,
			SerialNumber: a.SerialNumber,
			DiskNumber: a.DiskNumber,
			DiskCapacity: a.DiskCapacity,
			DiskFree: a.DiskFree,
			Partitions: a.Partitions,
		},
	];

	return a;
}

window.DrawDriveTable = async function DrawDriveTable(a) {
	const DriveData = FixDriveData(json.Hardware.Storage[a]);
	const div = `#DriveTable${a}`;

	var PartTable = await new Tabulator(div, {
		data: DriveData, //load row data from array
		layout: "fitColumns", //fit columns to width of table
		responsiveLayout: "hide", //hide columns that dont fit on the table
		pagination: "local", //paginate the data
		paginationSize: pageamount, //allow 10 rows per page of data
		paginationButtonCount: 99, // Show all pages
		paginationCounter: "rows", //display count of paginated rows in footer
		initialSort: [
			//set the initial sort order of the data
			{ column: "Name", dir: "asc" },
		],
		columnDefaults: {
			tooltip: true, //show tool tips on cells
		},
		columns: [
			{ title: "Name", field: "DeviceName" },
			{ title: "SN", field: "SerialNumber" },
			{ title: "#", field: "DiskNumber" },
			{ title: "Capacity (GB)", field: "DiskCapacity" },
			{ title: "Free (GB)", field: "DiskFree" },
		],
		rowFormatter: function (row) {
			//create and style holder elements
			var holderEl = document.createElement("div");
			var tableEl = document.createElement("div");

			holderEl.style.boxSizing = "border-box";
			holderEl.style.padding = "10px 30px 10px 10px";
			holderEl.style.borderTop = "1px solid inherit";
			holderEl.style.borderBotom = "1px solid inherit";

			tableEl.style.border = "1px solid inherit";

			holderEl.appendChild(tableEl);

			row.getElement().appendChild(holderEl);

			var subTable = new Tabulator(tableEl, {
				layout: "fitColumns",
				data: row.getData().Partitions,
				columns: [
					{ title: "Label", field: "PartitionLabel" },
					{ title: "Capacity (MB)", field: "PartitionCapacity" },
					{ title: "Free (MB)", field: "PartitionFree" },
					{ title: "FS Type", field: "Filesystem" },
				],
			});
		},
	});
};