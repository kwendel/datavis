const updateInfoBox = (id, d) => {
	let el = document.getElementById(id);

	let html = `<h3>${d.properties.statnaam}</h3><p>Stations in this (land) area:</p><ul>`;

	// Find stations in this province:
	for (let station of stations) {
		if (d3.geoContains(d.geometry, [station.lon, station.lat])) html += `<li>${station.name}</li>`;
	}

	html += "</ul>";
	el.innerHTML = html;
}