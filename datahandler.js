import * as d3 from 'd3';
import alasql from 'alasql';

export default class DataHandler {
	constructor(stations) {
		this.stations = stations;
		this.data = {};
	}

	getStationData(id) {
		return this.data[id]
	}

	async load(id) {
		return d3.json(`./knmi/stations/${id}.json`).then((d) => {
			console.log(`Succesfully loaded: ${id}`);
			this.data[id] = d;
			return d;
		}).catch((err) => {
			console.log(`Error loading: ${id}`);
			console.error(err);
		});
	}

	async loadAll() {
		let promises = this.stations.map(s => this.load(s.station));

		// Return promise that is fulfilled when all files are loaded
		return Promise.all(promises);
	}

	// Query the given station with the query, default will search in all station data.
	query(query, stations = []) {

		// Make array with data that we are going to query
		let searchIn = [];
		for (let s of stations) {
			searchIn.push(this.data[s]);
		}

		// search all stations if no stations where specified
		if (stations.length === 0) {
			searchIn = this.data;
		}

		let {select, where, groupby} = query;
		let q = `SELECT ${select} FROM ?`;
		if (where) {
			q = q + ` WHERE ${where}`;
		}
		if (groupby) {
			q = q + ` GROUP BY ${groupby}`;
		}
		console.log(searchIn);

		return alasql(q, searchIn)
	}

	queryRange(query, stations = []) {
		let {select, start, end} = query;
		return this.query({select: select, where: `DATE BETWEEN ${start} AND ${end}`}, stations)

	}
}

