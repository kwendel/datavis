import "@babel/polyfill";
import * as d3 from 'd3';
import $ from "jquery";

import DataHandler from './datahandler';
import RadialHistogram from './vis/radialHistogram'
import {calculateSVGWH} from "./utils";
// import Histogram from "./vis/histogram";
import BarChart from "./vis/barChart"
import Choropleth from "./vis/choropleth";
import LoadingScreen from "./vis/loading";

import * as daterangepicker from "daterangepicker";
import "bootstrap/dist/js/bootstrap.bundle";

// Define global variables
let datahandler, map, radial, sun, rain;

let season_queries = {
	"spring": "MONTH(DATE) BETWEEN 3 AND 5",
	"summer": "MONTH(DATE) BETWEEN 6 AND 8",
	"autumn": "MONTH(DATE) BETWEEN 9 AND 11",
	"winter": "MONTH(DATE) > 11 OR MONTH(DATE) < 3",
}

// Load data and start!
Promise.all([
	d3.json("./geoJSON/provincie_2017.json"),
	d3.json("./knmi/stations.json"),
]).then(function (files) {
	return start(files[0], files[1]);
}).catch(function (err) {
	throw err;
});

// Dirty dirty stuff here
$(document).ready(() => {

	const fixDropdownRadio = (e) => {
		$(e.currentTarget).dropdown('toggle');
		$(e.currentTarget).button('toggle');
	};

	const fixButtonFocus = (e) => {
		$(e.target).parents('.btn-group').find('label.dropdown-toggle > input:not(:checked)').parent('.active').removeClass('active')
		$('.dropdown-menu input:checked').parent().parent('li').toggleClass("active", true);
	};

	const dropdownRadioSelect = (e) => {
		let $target = $(e.currentTarget),
			$inp = $target.find('input');
		setTimeout(() => {
			let newprop = !$inp.prop("checked");
			$inp.prop("checked", newprop);
			$target.parent().toggleClass("active", newprop);
		}, 0);
		return false;
	};

	$("#geo_card .btn-group-toggle .btn.dropdown-toggle").off("click", fixDropdownRadio).on("click", fixDropdownRadio);
	$("#geo_card .btn-group .btn").off("click", fixButtonFocus).on("click", fixButtonFocus);
	$('#geo_card .dropdown-menu a').off('click', dropdownRadioSelect).on('click', dropdownRadioSelect);
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
	radial = new RadialHistogram('wind_container', '#wind_vis', stationdata);
	sun = new BarChart('sun_container', '#sun_vis', stationdata, 'Sunshine (hours)');
	rain = new BarChart('rain_container', '#rain_vis', stationdata, 'Precipitation (hours)');


	// Show map as first visualization
	map.drawMap();

	// Load all the stations files
	datahandler = new DataHandler(stations);

	let loadingInterval = LoadingScreen.start();

	progressPromise(datahandler.loadAll([]), LoadingScreen.updateProgress).then(() => {

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

			let dp_settings = {
				minDate: min,
				maxDate: max,
				startDate: min,
				endDate: max,
				showDropdowns: true,
				alwaysShowCalendars: true,
				autoApply: true,
				autoUpdateInput: true,
				linkedCalendars: false,
				timeZone: 'utc',
				ranges: {
					"Wind speed record": [new Date("2005-11-25"), new Date("2005-11-25")],
					"Most precipitation in one month": [new Date("2004-08-01"), new Date("2004-08-31")],
					"Coldest winter - 1963": [new Date("1962-12-01"), new Date("1963-03-01")],
					"Coldest Elfstedentocht": [new Date("1963-18-01"), new Date("1963-18-01")],
					"Warmest day in De Bilt": [new Date("2006-19-07"), new Date("2006-19-07")],
					"Warmest summer ever measured": [new Date("2018-01-06"), new Date("2018-01-09")],
					"Coldest day ever measured": [new Date("1942-27-01"), new Date("1942-27-01")],
					"Watersnoodramp 1953": [new Date("1953-25-01"), new Date("1953-03-02")]
				},
				locale: {
					format: 'MMMM Do, YYYY'
				}
			};

			// GEO MAP
			let geo_datepicker = $("#geomap_datepicker").daterangepicker($.extend({}, dp_settings));

			// WIND ROSE
			let windrose_datepicker = $("#windrose_datepicker").daterangepicker($.extend({}, dp_settings));

			// BAR CHART
			let minYear = min.getFullYear(), maxYear = max.getFullYear(), yearRange = Array.from({length: maxYear - minYear + 1}, (x, i) => maxYear - i);

			let date_selects = [document.getElementById("barchart_yearCompare"), document.getElementById("barchart_yearBegin"), document.getElementById("barchart_yearEnd")];

			for (let list of date_selects) {
				if ($(list).find('option').length === 0) {
					for (let year of yearRange) {
						list.add(new Option(year, year));
					}
				}
			}


			// RUN VIS

			// Button click handler
			$("#visualize").off("click").on("click", () => {

				// 1. Find out which visualization is selected
				let activeCard = $("#visSelection [aria-expanded='true']").parents(".card").attr('id');

				// 2. Load new visualization
				switch (activeCard) {

					case "geo_card":

						// Get active dates
						let startDate = geo_datepicker.data('daterangepicker').startDate.utc().toDate(),
							endDate = geo_datepicker.data('daterangepicker').endDate.utc().toDate(),
							valid = true;

						// Reset error classes
						$("#geo_card .invalid.btn-danger").addClass('btn-outline-secondary').removeClass('btn-danger');

						let q = "";

						// Check if season button is selected
						if ($("#geo_seasons").prop("checked") === true) {

							// Check if any seasons are selected
							let seasons_selected = $("#geo_season_dropdown input:checked");
							if (seasons_selected.length <= 0) {
								$("#geo_seasons").parent().addClass("invalid btn-danger").removeClass("btn-outline-secondary");
								valid = false;
							}

							// Build season query
							if (seasons_selected.length < 4) {
								q += "(";
								seasons_selected.each((i, el) => {
									if (i > 0) q += " or ";
									q += "(" + season_queries[el.id] + ")";
								});
								q += ")";
							}

						}

						// Check if months button is selected
						else if ($("#geo_months").prop("checked") === true) {

							// Check if any seasons are selected
							let months_selected = $("#geo_month_dropdown input:checked");
							if (months_selected.length <= 0) {
								$("#geo_months").parent().addClass("invalid btn-danger").removeClass("btn-outline-secondary");
								valid = false;
							}

							// Build season query
							if (months_selected.length < 12) {
								q += "(";
								let months = [];
								months_selected.each((i, el) => {
									months.push("MONTH(DATE) = " + el.getAttribute("data-month"))
								});
								q += months.join(" OR ") + ")";
							}

						}

						q += "";

						// Create visualization
						if (valid) {


							// map.drawMap();

							datahandler.queryRange({
								select: 'STN, DATE, TG as measurement',
								start: startDate,
								end: endDate,
								where: q
							}).then((d) => {
								map.setData(d);
								map.plot();

								updateVisScreens(activeCard);
							});


						}

						break;

					case "windrose_card":

						// Get active dates
						let startDateWindRose = windrose_datepicker.data('daterangepicker').startDate.utc().toDate(),
							endDateWindRose = windrose_datepicker.data('daterangepicker').endDate.utc().toDate();


						datahandler.queryRange({
							select: 'STN, DATE as date, CAST(DDVEC as Number) as angle, CAST(FHVEC as Number) as speed, CAST(FG as Number) as avg_speed',
							start: startDateWindRose,
							end: endDateWindRose,
						}).then(d => {
							radial.plotData(d)
						});

						updateVisScreens(activeCard);
						break;

					case "barchart_card":

						let type = $("#" + activeCard).find("input:radio:checked").attr("id");
						let qvar = type === "sun" ? "SQ" : "DR";
						let qvar2 = type === "sun" ? "SP" : "RH";
						activeCard += " " + type;

						let beginYear = $("#barchart_yearBegin").val(),
							endYear = $("#barchart_yearEnd").val(),
							compareYear = $("#barchart_yearCompare").val();

						console.log(beginYear, endYear, compareYear);


						Promise.all([datahandler.queryRange({
							select: `STN, DATE as date, CAST(${qvar} as Number) as duration, CAST(${qvar2} as Number) as percentage`,
							start: beginYear + "-01-01",
							end: endYear + "-12-31"
						}), datahandler.queryRange({
							select: `STN, DATE as date, CAST(${qvar} as Number) as duration, CAST(${qvar2} as Number) as percentage`,
							start: compareYear + '-01-01',
							end: compareYear + '12-31'
						})]).then((query_data) => {

							if (type === "sun") {
								console.log("sun");
								sun.plotData(query_data[0], query_data[1], '', 'Amount of sun hours ');
							} else {
								console.log("rain");
								rain.plotData(query_data[0], query_data[1], '', 'Amount of rainfall ');
							}

							updateVisScreens(activeCard);
						});


						break;
				}


			});


		});


	});


}

const updateVisScreens = (activeCard) => {

	// Show right visualization
	$(".vis-container").removeClass("visible");
	$(`.vis-container[data-card="${activeCard}"]`).addClass("visible");

};

