import * as d3 from 'd3';
import alasql from 'alasql';

export default class DataHandler {
	constructor(stations) {
		this.stations = stations;
		this.data = {};

		this.dateFormatter = d3.timeFormat("%Y-%m-%d");
	}

	getStationData(id) {
		return this.data[id]
	}

	getStationsInRegion(code) {
		return this.stations.filter((s) => s.province_code === code);
	}

	async load(id) {
		// force cache use since the knmi station files wont change
		return d3.json(`./knmi/stations/${id}.json`, {cache: "force-cache"}).then((d) => {
			this.data[id] = d;
		}).catch((err) => {
			console.log(`Error loading: ${id}`);
			console.error(err);
		});
	}

	loadAll(ids = []) {
		let promises = this.stations.filter(s => ids.length === 0 || ids.includes(s.station)).map(s => this.load(s.station));

		// Return promise that is fulfilled when all files are loaded
		return promises;
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
	query({select, where, orderby, groupby, limit}, stations = []) {
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
			q += ` WHERE ${where}`;
		}
		if (groupby) {
			q += ` GROUP BY ${groupby}`;
		}
		if (orderby) {
			q += ` ORDER BY ${orderby}`;
		}
		if (limit) {
			q += ` LIMIT ${limit}`;
		}

		console.log("Executing query: " + q)

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
	async queryRange({select, where, groupby, start, end}, stations = []) {

		// Convert date objects to string
		if (start instanceof Date) start = this.dateFormatter(start)
		if (end instanceof Date) end = this.dateFormatter(end)

		let whereClause = `DATE BETWEEN '${start}' AND '${end}'`;
		if (where) whereClause += ` AND ${where}`;

		return await this.query({
				select: select,
				where: whereClause,
				orderby: `DATE asc`,
				groupby: groupby
			},
			stations);

	}
}

