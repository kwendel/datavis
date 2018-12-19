import * as d3 from "d3";

/**
 * Continuous color scale legend.
 * Source: http://bl.ocks.org/syntagmatic/e8ccca52559796be775553b467593a9f
 */
export default class ContinousLegend {

	constructor(selector_id) {
		this.selector = selector_id;
	}

	legend(colorScale, colors, svg, delta = false) {

		const s = "choroplethLegend", legendheight = 250, legendwidth = 15;

		let legendDefs = d3.select("defs#legend");
		let colors_reverse = colors.slice();

		// Clear existing legend of this type
		legendDefs.selectAll(`#${s}`).remove();

		// Add linearGradient
		let gradient = legendDefs.append("linearGradient").attr("id", s)
			.attr('x1', '0%')
			.attr('y1', '0%')
			.attr('x2', '0%')
			.attr('y2', '100%');

		// Set the colors of the color scale
		gradient.selectAll('stop')
			.data(colors_reverse)
			.enter()
			.append('stop')
			.attr('offset', (d, i) => `${i * 1 / (colors.length - 1) * 100}%`)
			.attr('stop-color', (d) => d);

		svg.selectAll(".legend-container").remove();

		let svgLegend = svg.append("g").attr("class", "legend-container");
		let tickValues, min, max, domain_array;

		if (delta) {

			let domain = colorScale.domain();
			min = domain[0];
			max = domain[domain.length - 1];

			// Fix legend if min == max
			if (min == max) {
				min -= 0.01;
				max += 0.01;
			}

			let mean = (min + max) / 2;
			tickValues = [min, mean, max];

			domain_array = [min, max];

		} else {

			min = -40;
			max = 40;

			tickValues = d3.range(min, max, 10); // Steps of 10 degrees
			tickValues.push(max);


			domain_array = [max, min];
		}

		let legendScale = d3.scaleLinear()
			.domain(domain_array) // Add one extra tick in front and end
			.range([0, legendheight]);

		let legendaxis = d3.axisRight()
			.scale(legendScale)
			.tickSize(legendwidth)
			.tickPadding(6)
			.tickValues(tickValues)
			.tickFormat(t => Number(t).toFixed(1) + "°C")

		svgLegend.append("rect")
			.attr("height", legendheight + "px")
			.attr("width", legendwidth + "px")
			.style("fill", `url(#${s})`)
			.attr("transform", "translate(0,10)")

		svgLegend
			.append("g")
			.attr("class", "axis")
			.attr("transform", "translate(0,10)")
			.call(legendaxis);
	}

}
