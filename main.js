import "@babel/polyfill";
import * as d3 from 'd3';
import Datahandler from './datahandler';

// Define global variables
let container = document.getElementById('map_container');
let map = d3.select('#map');
let
	viewWidth,
	viewHeight,
	projection,
	path
;
// Global data variables
let
	stations,
	datahandler
;

const calculateWH = () => {
	// Calculate inner element size
	let style = getComputedStyle(container);
	let elementWidth = container.clientWidth;
	let elementHeight = container.clientHeight;
	viewWidth = elementWidth - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
	viewHeight = elementHeight - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);

	// Set svg attribute size
	map = map
		.attr('width', viewWidth)
		.attr('height', viewHeight);
};

const drawMap = (url) => {
	return d3.json(url).then((mapdata) => {
		calculateWH();
		// Mercator projection is worldmap on a square
		projection = d3.geoMercator().fitSize([viewWidth, viewHeight], mapdata);

		// Fit projection to size
		projection = projection.fitSize([viewWidth, viewHeight], mapdata);
		path = d3.geoPath().projection(projection);

		// create group or use existing one
		d3.selectAll("#map *").remove();

		// features paths
		map.selectAll('path')
			.data(mapdata.features)
			.enter()
			.append('path')
			.attr('d', path)
			.attr('vector-effect', 'non-scaling-stroke') // keeps stroke-width the same if we transform
			.on('mouseover', (d, i, nodes) => {
				d3.select(nodes[i]).classed('hover', true)
			})
			.on('mouseout', (d, i, nodes) => {
				d3.select(nodes[i]).classed('hover', false)
			})
			.on('click', (d) => updateInfoBox("example", d));
	}).catch((err) => {
		console.error(`Error during reading geoJSON with url: ${url}`);
		console.error(err)
	});
};

const drawStations = (url) => {
	return d3.json(url).then((s) => {
		// Save stations for later reference
		stations = s;

		// Draw stations as svg circle
		let points = map.append('g');
		points
			.selectAll('circle')
			.data(stations)
			.enter()
			.append('circle')
			.attr('cx', (d) => projection([d.lon, d.lat])[0])
			.attr('cy', (d) => projection([d.lon, d.lat])[1])
			.attr('r', 3)
			.style('fill', 'red');
	}).catch((err) => {
		console.error(`Error during reading the stations with url: ${url}`);
		console.error(err)
	});
};

const updateInfoBox = (id, d) => {
	let el = document.getElementById(id);

	let html = `<h3>${d.properties.statnaam}</h3><p>Stations in this (land) area:</p><ul>`;

	// Find stations in this province:
	for (let station of stations) {
		if (d3.geoContains(d.geometry, [station.lon, station.lat])) html += `<li>${station.name}</li>`;
	}

	html += "</ul>";
	el.innerHTML = html;
};

async function start() {
	// Set resize handler
	// TODO: create seperate resize handler so we dont reload files
	d3.select(window).on('resize', start);

	datahandler = new Datahandler(stations);
	Promise.all([
		// Draw map
		drawMap("./geoJSON/provincie_2017.json"),
	 	drawStations("./knmi/stations.json"),
		// Load all the stations files
		datahandler.loadAll(),
	]).then(() => {
		// All is now loaded and we are ready to query and create visualizations

		// TODO: initialize visualizations
		// example
		console.log('Query range 2014 with ddvec < 80');
		datahandler.queryRange({
			select: 'STN, DATE, DDVEC',
			start: '2014-01-01',
			end: '2015-01-01',
			where: 'DDVEC < 80',
		}).then((d) => {
			console.log(d)
		});

	});
}

start();
