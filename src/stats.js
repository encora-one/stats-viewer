fetchHandleError = (response) => {
  //console.log(response);
  if (response.ok) return response;

  throw Error(response.statusText);
}

fetchJson = (response) => {
  return response.json();
}

fetchWrapper = (url, options, cb, error_cb) => {
  options.headers = options.headers || {};
  options.headers['X-Requested-With'] = 'XMLHttpRequest';
  return fetch(url, options).then(fetchHandleError).then(fetchJson).then(cb).catch(error_cb || console.error);
}


stringToColor = (str) => {
  var hash = 0;
  for (var i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  var color = '#';
  for (var i = 0; i < 3; i++) {
    var value = (hash >> (i * 8)) & 0xFF;
    color += ('00' + value.toString(16)).substr(-2);
  }
  return color;
}


convertLimit = (url) => {
  if (!url.includes('?'))
    url += '?';

  const value = urlParams.get('limit');
  if (value)
    url = url.replace('stats/', 'stats/all/')

  return url;
}


const urlParams = new URLSearchParams(window.location.search);
window.charts = [];

function chartWrapper(url, element, mainLabel, title) {
  url = convertLimit(url);

  fetchWrapper(url,{},function(data){
    //console.log(data);
    let labels = [];
    let values = [];
    let colors = [];
    for (const [k,v] of Object.entries(data)) {
      labels.push(k);
      values.push(v);
      colors.push(stringToColor(k));
    }
    // TODO 2020-01-13
    // displayLegend when the canvas is too big
    const displayLegend = (labels.length > 10) ? false : true;
    const elem = (element && element.nodeType === Node.ELEMENT_NODE ) ? element : document.getElementById(element).getContext('2d');
    window.charts[elem.canvas.id] = new Chart(elem, {
      type: 'pie',
      data: {
        labels: labels,
        datasets: [{
          data: values,
          backgroundColor: colors,
          label: mainLabel,
        }],
      },
      options: {
        legend: {
          display: displayLegend,
          position: 'bottom',
        },
        title: {
          display: true,
          text: title,
        },
      },
    });  // new Chart

    $('.spinner').remove();
  });  // fetchWrapper
}  // chartWrapper


document.addEventListener('DOMContentLoaded', () => {
  $('a[data-toggle="tab"][data-type="pie"]').on('show.bs.tab', function () {
    $(this).unbind('show.bs.tab');
    //if (this.loading) return;
    //this.loading = true;
    const pane = document.getElementById(this.getAttribute('aria-controls'));
    pane.innerHTML = '<div class="spinner text-center"><i class="fa fa-spinner fa-pulse" aria-hidden="true"></i><i> Loading.</i></div>' + pane.innerHTML;
    const url = this.dataset.url;
    //const elem = this.getElementsByTagName('canvas')[0];
    const elem = this.dataset.canvas;
    const label = this.dataset.label;
    const title = this.dataset.title;
    return chartWrapper(url, elem, label, title);
  });  // a[data-toggle="tab"][data-type="pie"]


  $('#nav-stats-tab').on('show.bs.tab', function () {
    $(this).unbind('show.bs.tab');
    const pane = document.getElementById(this.getAttribute('aria-controls'));
    pane.innerHTML = '<div class="spinner text-center"><i class="fa fa-spinner fa-pulse" aria-hidden="true"></i><i> Loading.</i></div>' + pane.innerHTML;
    let url = this.dataset.url;
    const element = this.dataset.canvas;

    url = convertLimit(url);

    fetchWrapper(url,{},function(data){
      //console.log(data);
      const created_at = [];
      const labels = ['num_users', 'num_productions', 'num_tours', 'num_performances', 'num_performers', 'num_characters', 'num_castmembers', 'num_masters', 'num_recordings'];
      let ds = {};
      for (const k of labels) {
        ds[k] = [];
      }
      let datasets = [];
      for (const o of data) {
        created_at.push(o['created_at']);
        for (const k of labels) {
          ds[k].push(o[k]);
        }
      }
      for (const [k,v] of Object.entries(ds)) {
        datasets.push({
          label: k.replace('num_', ''),
          data: v,
          borderColor: stringToColor(k),
        });
      }
      const elem = (element && element.nodeType === Node.ELEMENT_NODE ) ? element : document.getElementById(element).getContext('2d');
      //const chart_id = element.id ?? element;
      // Whatever webpack we're using doesn't have nullishCoalescingOperator yet
      //const chart_id = element.id || element;
      const chart_id = elem.canvas.id;
      window.charts[chart_id] = new Chart(elem, {
        type: 'line',
        data: {
          labels: created_at,
          datasets: datasets,
        },
        options: {
          scales: {
            xAxes: [{
              type: 'time',
              time: {
                //parser: timeFormat,
                //round: 'day',
                //tooltipFormat: 'll HH:mm',
              },
              scaleLabel: {
                display: true,
                labelString: 'Date'
              },
            }],
            yAxes: [{
              type: 'logarithmic',
              scaleLabel: {
                //display: true,
                //labelString: 'value',
              },
            }]
          },
          /*
          legend: {
            display: displayLegend,
            position: 'bottom',
          },
          title: {
            display: true,
            text: title,
          },
          */
        },
      });  // new Chart

      const toggle = $('input[name="stats-logarithmic-toggle"]');
      toggle.click((e) => {
        const checked = toggle.prop('checked');
        const chart = window.charts[chart_id];
        chart.config.options.scales.yAxes[0].type = checked ? 'logarithmic' : 'linear';
        // TODO 2020-06-07
        // Change the tick labels from scientific notation to decimal
        // https://www.chartjs.org/docs/latest/axes/cartesian/linear.html
        chart.update();
      });

      $('.spinner').remove();
    });  // fetchWrapper
  });  // #nav-stats-tab


  $('#nav-records-tab,#nav-multiple-tab').on('show.bs.tab', function () {
    $(this).unbind('show.bs.tab');
    const pane = document.getElementById(this.getAttribute('aria-controls'));
    pane.innerHTML = '<div class="spinner text-center"><i class="fa fa-spinner fa-pulse" aria-hidden="true"></i><i> Loading.</i></div>' + pane.innerHTML;
    const url = this.dataset.url;

    // Eww maybe we need a fetchJsonWrapper instead
    fetch(url, {headers: {'X-Requested-With': 'XMLHttpRequest'}})
      .then((response)=>{
        return response.text();
      })
      .then((html)=>{
        pane.innerHTML = html;
      })
      .then(()=>{
        // This add buttons only when not loaded via hash (because that'll duplicate the buttons)
        //if (`#${pane.id}` !== hash)
        //addCastButtons($(pane).find('a'));
        //nvm how about we count the tippys
        // doesn't work race condition oh well
        const $$ = $(pane);
        if ($$.find('[data-toggle="tippy"]').length === 0)
          addCastButtons($$.find('a'));
      })
  });  // #nav-records-tab


  const hash = window.location.hash;
  if (hash) {
    return $(`div.nav a[href="${hash}"]`).tab('show');
  }
  $('#nav-tab a:first-child').tab('show');
});  // DOMContentLoaded
