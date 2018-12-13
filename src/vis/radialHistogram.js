import * as d3 from 'd3';

export default class RadialHistogram {
	constructor(svgid) {
		this.svg = d3.select(svgid);
		this.viewHeight = this.svg.attr('height');
		this.viewWidth = this.svg.attr('width');

		this.innerRadius = 20;
		this.outerRadius = Math.min(this.viewWidth, this.viewHeight) / 2;

		this.group = this.svg
			.append('g')
			.attr('transform', `translate(${this.viewWidth / 2},${this.viewHeight / 2})`);

		this.initAxis();
	}

	initAxis() {
		this.angle = d3.scaleLinear()
			.range([0, 2 * Math.PI]);

		this.radius = d3.scaleLinear()
			.range([this.innerRadius, this.outerRadius]);

		this.x = d3.scaleBand()
			.range([0, 2 * Math.PI])
			.align(0);

		this.y = d3.scaleLinear() //you can try scaleRadial but it scales differently
			.range([this.innerRadius, this.outerRadius]);

		this.z = d3.scaleOrdinal()
			.range(["#4242f4", "#42c5f4", "#42f4ce", "#42f456", "#adf442", "#f4e242", "#f4a142", "#f44242"]);

	}

	setDomain(data) {
		this.x.domain(this.directionRange);
		this.y.domain([0, d3.max(data, (d) => d.total)]);
		this.z.domain(this.speedRange);

		// Extend the domain slightly to match the range of [0, 2π].
		this.angle.domain([0, this.directionRange.length]);
		this.radius.domain([0, 0]);
	}

	setLegend(dataRange) {
		let legend = this.group.append("g")
			.selectAll("g")
			.data(dataRange.reverse())
			.enter().append("g")
			.attr("transform", (d, i) => {
				return "translate(" + (this.outerRadius + 0) + "," + (-this.outerRadius + 40 + (i - (dataRange.length) / 2) * 20) + ")";
			});

		legend.append("rect")
			.attr("width", 18)
			.attr("height", 18)
			.attr("fill", this.z);

		legend.append("text")
			.attr("x", 24)
			.attr("y", 9)
			.attr("dy", "0.35em")
			.text((d) => {
				return d;
			})
			.style("font-size", 12);
	}

	setLabels(data, angleOffset, angleKey) {
		let label = this.group.append("g")
			.selectAll("g")
			.data(data)
			.enter().append("g")
			.attr("text-anchor", "middle")
			.attr("transform", (d) => {
				return "rotate(" + ((this.x(d[angleKey]) + this.x.bandwidth() / 2) * 180 / Math.PI - (90 - angleOffset)) + ")translate(" + (this.outerRadius + 30) + ",0)";
			});

		label.append("text")
			.attr("transform", (d) => {
				return (this.x(d[angleKey]) + this.x.bandwidth() / 2 + Math.PI / 2) % (2 * Math.PI) < Math.PI ? "rotate(90)translate(0,16)" : "rotate(-90)translate(0,-9)";
			})
			.text((d) => {
				return d[angleKey];
			})
			.style("font-size", 14);
	}

	setData(stackedData, angleOffset, angleKey) {
		this.group.append("g")
			.selectAll("g")
			.data(stackedData)
			.enter()
			.append("g")
			.attr("fill", (d) => {
				return this.z(d.key);
			})
			.selectAll("path")
			.data((d) => d)
			.enter()
			.append("path")
			.attr("d", d3.arc()
				.innerRadius((d) => {
					return this.y(d[0]);
				})
				.outerRadius((d) => {
					return this.y(d[1]);
				})
				.startAngle((d) => {
					return this.x(d.data[angleKey]);
				})
				.endAngle((d) => {
					return this.x(d.data[angleKey]) + this.x.bandwidth();
				})
				.padAngle(0.01)
				.padRadius(this.innerRadius))
			.attr("transform", function () {
				return "rotate(" + angleOffset + ")"
			});
	}

	setAxisLines() {
		this.group.selectAll(".axis")
			.data(d3.range(this.angle.domain()[1]))
			.enter()
			.append("g")
			.attr("class", "axis")
			.attr("transform", (d) => {
				return "rotate(" + this.angle(d) * 180 / Math.PI + ")";
			})
			.call(d3.axisLeft()
				.scale(this.radius.copy().range([-this.innerRadius, -(this.outerRadius + 10)])));

		let yAxis = this.group.append("g")
			.attr("text-anchor", "middle");

		let yTick = yAxis
			.selectAll("g")
			.data(this.y.ticks(5).slice(1))
			.enter().append("g");

		yTick.append("circle")
			.attr("fill", "none")
			.attr("stroke", "gray")
			.attr("stroke-dasharray", "4,4")
			.attr("r", this.y);

		yTick.append("text")
			.attr("y", (d) => {
				return -this.y(d);
			})
			.attr("dy", "-0.35em")
			.attr("x", () => {
				return -10;
			})
			.text(this.y.tickFormat(5, "s"))
			.style("font-size", 14);
	}

	setTransformRanges(maxSpeed) {
		// DirectionRange
		this.directionRange = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];

		// SpeedRange
		// We divide the speed range in nrOfBands parts
		let nrOfBands = 8;
		let stepSize = maxSpeed / nrOfBands;
		this.speedRange = [];
		for (let i = 0; i < nrOfBands; i++) {
			this.speedRange.push(`${i * stepSize} - ${(i + 1) * stepSize}`);
		}

		// Stacker stacks the data based on the speed range blocks
		// When we stack we want high values on top, therefore we reverse the order
		this.stacker = d3.stack()
			.keys(this.speedRange.reverse());
	}

	transformData(data, maxSpeed) {
		// Changes 0-360 degree vector to named direction
		let direction = d3.scaleQuantize()
			.domain([0, 360])
			.range(["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"]);

		// Change speed to discrete blocks
		let speed = d3.scaleQuantize()
			.domain([0, maxSpeed])
			.range(this.speedRange);

		// Change data
		for (let d of data) {
			d.range = speed(d.speed);
			d.angle = direction(d.angle);
		}

		return data;
	}

	computeFrequencies(data, totalDays) {
		// Nest on angle, and per angle on range
		let nested = d3.nest()
			.key((d) => d.angle)
			.key((d) => d.range)
			.entries(data);

		// Compute frequencies
		for (let direction of nested) {
			let windSpeeds = direction.values;
			direction.total = 0;

			for (let w of windSpeeds) {
				// Compute percentage of total
				w.percentage = (w.values.length / totalDays) * 100;
				direction.total += w.percentage;

				// Save windspeedRange = % in direction object because this is easier for stacking
				direction[w.key] = w.percentage;
			}
		}
		return nested
	}

	removeUndefinedValues(data) {
		return data.filter((d) => {
			return d.angle !== undefined && d.speed !== undefined
		})
	}


	plotData(data) {
		let maxSpeed = d3.max(data, (d) => d.speed);
		// TODO: find way to compute the amount of days from the data
		let totalDays = data.length;


		// Transform the data
		// - first, remove any undefined values
		// - transform direction and speed to discrete steps
		// - then compute the frequencies of the speed steps per direction
		data = this.removeUndefinedValues(data);
		this.setTransformRanges(maxSpeed);
		data = this.transformData(data, maxSpeed);
		data = this.computeFrequencies(data, totalDays);

		// Now draw the data
		let angleOffset = -360.0 / data.length / 2.0;
		this.setDomain(data);
		this.setLabels(data, angleOffset, 'key');
		this.setLegend(this.speedRange);

		// Stack the data so we can draw the stacked bars
		this.setData(this.stacker(data), angleOffset, 'key');
		this.setAxisLines();

	}

}