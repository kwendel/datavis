import * as d3 from 'd3';
import ContinousLegend from "./continuousLegend";

/**
 * Display colors on map.
 */
export default class Choropleth {

	constructor(containerid, svgid, mapdata, stationdata) {

		this.container = document.getElementById(containerid);
		this.map = d3.select(svgid);

		this.mapdata = mapdata;
		this.stationdata = stationdata;

		this.temperatureColors = d3.schemeRdBu[9];
		this.minMaxColors = ['#67a9cf', '#f7f7f7', '#ef8a62']; // Colorbrewer: RdBu3

		this.colorScale = d3.scaleLinear().domain([40, 30, 20, 10, 0, -10, -20, -30, -40]).range(this.temperatureColors);
		this.minMaxScale = d3.scaleLinear().range(this.minMaxColors);

		this.station_area_map = new Map();
		this.stationdata.map(x => this.station_area_map.set(x.station, x.province_code));

		this.active_stations = new Set();

		this.legend = new ContinousLegend("#test");
	}

	/**
	 * Draw map projection.
	 */
	drawMap() {

		// Update dimensions
		this.calculateWH();

		// Fit projection to size
		this.projection = d3.geoMercator().fitSize([this.viewWidth, this.viewHeight], this.mapdata);
		this.path = d3.geoPath().projection(this.projection);

		this.map.selectAll(`${this.svgid} *`).remove();

		// features paths
		this.map.selectAll('path')
			.data(this.mapdata.features)
			.enter()
			.append('path')
			.attr('d', this.path)
			.attr('pvid', d => d.id)
			.attr('vector-effect', 'non-scaling-stroke') // keeps stroke-width the same if we transform
			.on('mouseover', (d, i, nodes) => {
				d3.select(nodes[i]).classed('hover', true);
				this.map.classed("hover", true);
			})
			.on('mouseout', (d, i, nodes) => {
				d3.select(nodes[i]).classed('hover', false);
				this.map.classed("hover", false);
			});

		this.stations = this.map.append('g').attr("class", "stations-group");
		this.labels = this.map.append("g").attr("class", "label-group");
	}

	/**
	 * Add station markers to map.
	 */
	addStations() {

		// Filter active stations
		let stations = this.stationdata.filter(station => this.active_stations.has(station.station));

		// Remove all stations
		this.map.selectAll('circle').remove();

		// Add stations
		this.stations.selectAll('circle')
			.data(stations)
			.enter()
			.append('circle')
			.attr('cx', (d) => this.projection([d.lon, d.lat])[0])
			.attr('cy', (d) => this.projection([d.lon, d.lat])[1])
			.attr('r', 5);
	}

	addEventHandler(event, callback) {
		this.map.selectAll('path').on(event, callback);
	}

	/**
	 * Applies a linear color scale with this area's value at the center.
	 *
	 * @param d Area/province to use as baseline.
	 */
	setBaseline(d, i, nodes) {

		// Don't apply this visualization on provinces without data
		if (typeof this.data[d.id] == "undefined" || isNaN(this.data[d.id])) return;

		// Unset selection
		d3.selectAll("path").classed("selected", false);

		// Disable this visualization when clicking the active province
		if (typeof this.activeBaseline != "undefined" && this.activeBaseline === d) {
			this.activeBaseline = null;
			d3.select(nodes[i]).classed("selected", false);
			this.plot();
			return;
		}

		// Select this province on map
		d3.selectAll("path").classed("selected", false);
		d3.select(nodes[i]).classed("selected", true);

		// Set active province
		this.activeBaseline = d;

		// Calculate domain based on min/max distance to clicked value
		let [min, max] = d3.extent(Object.values(this.data));
		let mean = this.data[d.id];
		let delta = Math.max(Math.abs(min - mean), Math.abs(max - mean));

		// Set domain
		this.minMaxScale.domain([mean - delta, mean, mean + delta]);

		// Recolor provinces
		this.map.selectAll("path").style("fill", x => this.color(x, this.minMaxScale))

		// Reset labels
		this.drawLabels(_d => {
			let val = this.data[_d.id];
			if (isNaN(val)) return "";
			if (d.id !== _d.id) val -= mean;
			let str = Number(val).toFixed(1) + "°C";
			if (val > 0 && d.id !== _d.id) str = "+" + str;
			return str;
		});

		// Recolor legend
		this.legend.legend(this.minMaxScale, this.minMaxColors.slice().reverse(), this.map, true);

		// Unset hover
		d3.selectAll("*.hover").classed("hover", false);
		d3.selectAll(d).classed("selected", true);
	}

	/**
	 * Calculates width and height of map.
	 */
	calculateWH() {
		let style = getComputedStyle(this.container);
		this.viewHeight = this.container.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
		this.viewWidth = this.container.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
	}

	/**
	 * Add data to map.
	 * @param measurements List of records. Required fields: 'STN', 'DATE', 'measurement'.
	 */
	setData(measurements) {

		// Calculate averages for the selected data, per province
		let data = {};

		this.maxdate = measurements.length > 0 ? measurements[measurements.length - 1].DATE : false;

		this.active_stations = new Set();

		// TODO: might be improved with native d3 code
		measurements.forEach((row) => {

			// Don't use rows without the measurement we need
			if (typeof row.measurement == "undefined") return;

			let stnID = parseInt(row.STN);
			this.active_stations.add(stnID);

			// Get area code
			let PV = this.station_area_map.get(stnID);

			// Add measurements to data object
			if (typeof (data[PV]) == "undefined") data[PV] = {};
			if (typeof (data[PV][row.DATE]) == "undefined") data[PV][row.DATE] = [];
			data[PV][row.DATE].push(parseInt(row.measurement));
		});

		// Calculate averages per province for all data
		for (let province in data) {
			let average = 0, days = 0;

			// Calculate sum for all measurements on this day
			for (let date in data[province]) {
				average += data[province][date].filter(x => !isNaN(x)).reduce((avg, value, _, {length}) => avg + (value / 10) / length, 0);
				days++;
			}

			// Calculate average for this province
			data[province] = average / days;
		}

		// Store data
		this.data = data;
	}

	/**
	 * Plot data that is associated with this map.
	 *
	 * @param data List of records. Required fields: 'STN', 'DATE', 'measurement'.
	 */
	plot() {

		// Unset selection
		d3.selectAll("path").classed("selected", false);

		// Color provinces
		this.map.selectAll("path").style("fill", d => this.color(d));

		// Update legend
		this.legend.legend(this.colorScale, this.temperatureColors, this.map);

		let flevo = d3.selectAll("path[pvid='PV24']");
		if (new Date(this.maxdate).getFullYear() < 1970) {
			flevo.classed("hidden", true);
		} else {
			flevo.classed("hidden", false);
		}

		// Draw stations
		this.addStations();

		// Draw labels
		this.drawLabels(d => {
			let val = this.data[d.id];
			return isNaN(val) ? "" : Number(val).toFixed(1) + "°C";
		});

		// Add click handler for delta comparisons
		this.addEventHandler("click", (d, i, nodes) => this.setBaseline(d, i, nodes));
	}

	drawLabels(func) {

		// Remove existing labels
		this.map.selectAll(".label").remove();

		// Draw labels
		this.labels.selectAll(".label")
			.data(this.mapdata.features)
			.enter()
			.append("text")
			.attr("class", "label")
			.attr("x", d => this.path.centroid(d)[0])
			.attr("y", d => this.path.centroid(d)[1])
			.text(func);
	}

	/**
	 * Calculate color for province based on a color scale.
	 *
	 * @param d Province object.
	 * @param scale Color scale.
	 * @returns {*} Color for province.
	 */
	color(d, scale) {
		if (d == null || d.type !== "Feature") return; // Only color provinces
		if (typeof scale == "undefined") scale = this.colorScale;
		let value = this.data[d.id];
		return typeof value == "undefined" ? "url(#na)" : scale(value);
	}

}