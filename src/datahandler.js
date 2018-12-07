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
		// force cache use since the knmi station files wont change
		return d3.json(`./knmi/stations/${id}.json`, {cache: "force-cache"}).then((d) => {
			console.log(`Succesfully loaded: ${id}`);
			this.data[id] = d;
			return;
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

	// query the given station with the query, default will search in all station data.
	// IMPORTANT:
	// - wrap string with quotes beforing querying or it wont find anything: DATE = '2018-01-01'
	// - numbers dont need quotes
	// EXAMPLE INPUT:
	// datahandler.query({
	// 			select: '*',
	//			where: 'DDVEC < 80',
	// 			orderby: 'DDVEC asc'
	// ));
	query({select, where, orderby}, stations = []) {
		// Make array with data that we are going to query
		let searchIn = [];
		for (let s of stations) {
			searchIn = searchIn.concat(...this.getStationData(s));
		}

		// search all stations if no stations where specified
		if (stations.length === 0) {
			searchIn = searchIn.concat(...Object.values(this.data))
		}

		// Build the query
		let q = `SELECT ${select} FROM ?`;
		if (where) {
			q = q + ` WHERE ${where}`;
		}
		if (orderby) {
			q = q + ` ORDER BY ${orderby}`;
		}

		// Return a promise with the result
		return alasql.promise(q, [searchIn])
	}

	// queryRange will query in the given date range for the given station, default will query all station data.
	// TODO: ordering is sometimes ascending by dates but per STN (id) sorted. Not sure how to fix this
	// EXAMPLE INPUT:
	// datahandler.queryRange({
	// 			select: '*',
	// 			start: '2014-01-01',
	// 			end: '2015-01-01',
	// 			where: 'DDVEC < 80',
	// 		}))
	queryRange({select, where, start, end}, stations = []) {
		// let {select, where, start, end} = query;
		return this.query({
				select: select,
				where: `DATE BETWEEN '${start}' AND '${end}' AND ${where}`,
				orderby: `DATE asc`
			},
			stations);

	}
}

