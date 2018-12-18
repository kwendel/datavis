import "@babel/polyfill";
import * as d3 from 'd3';
// import * as dp from "daterangepicker";
import $ from "jquery";

import DataHandler from './datahandler';
import RadialHistogram from './vis/radialHistogram'
import Choropleth from "./vis/choropleth";
import LoadingScreen from "./vis/loading";

import * as daterangepicker from "daterangepicker";

// Define global variables
let datahandler, map;

// Load data and start!
Promise.all([
	d3.json("./geoJSON/provincie_2017.json"),
	d3.json("./knmi/stations.json"),
]).then(function (files) {
	return start(files[0], files[1]);
}).catch(function (err) {
	throw err;
});


function progressPromise(promises, tickCallback) {
	let len = promises.length, progress = 0;

	function tick(promise) {
		promise.then(() => {
			progress++;
			tickCallback(progress, len);
		});
		return promise;
	}

	return Promise.all(promises.map(tick));
}


function start(mapdata, stationdata) {

	// Draw map and wait for the stations
	let stations = stationdata;
	map = new Choropleth("map_container", "#map", mapdata, stationdata);
	map.drawMap();

	// Load all the stations files
	datahandler = new DataHandler(stations);

	let loadingInterval = LoadingScreen.start();

	progressPromise(datahandler.loadAll(), LoadingScreen.updateProgress).then(() => {

		LoadingScreen.stop(loadingInterval);

		// Get min/max dates
		Promise.all([datahandler.query({
			select: "DATE",
			orderby: "DATE ASC",
			limit: 1
		}), datahandler.query({
			select: "DATE",
			orderby: "DATE DESC",
			limit: 1
		})]).then(values => {

			// Create JS date objects from extent
			let min = new Date(values[0][0].DATE), max = new Date(values[1][0].DATE);

			// Add datepickers
			let datepicker = $("#datepicker").daterangepicker({
				minDate: min,
				maxDate: max,
				startDate: min,
				endDate: max,
				showDropdowns: true,
				alwaysShowCalendars: true,
				autoApply: true,
				autoUpdateInput: true,
				linkedCalendars: false,
				ranges: {
					"Winter '63": [new Date("1962-12-21"), new Date("1963-03-21")],
					"Juli 2018": [new Date("2018-07-01"), new Date("2018-07-31")]
				},

			});

			// Button click handler
			$("#visualize").off("click").on("click", () => {

				let startDate = $('#datepicker').data('daterangepicker').startDate.toDate(),
					endDate = $('#datepicker').data('daterangepicker').endDate.toDate(),
					seasonQuery = $("#season_selection input:checked").data("sql");

				console.log(startDate)
				console.log(endDate)

				runVis(startDate, endDate, seasonQuery);

			});


		});


	});


}

const runVis = (start, end, q) => {

	datahandler.queryRange({
		select: 'STN, DATE, TG as measurement',
		start: start,
		end: end,
		where: q
	}).then((d) => {
		map.setData(d);
		map.plot();
	});

};

