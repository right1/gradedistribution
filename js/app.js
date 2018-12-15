
$(function () {
    var gradeThresholds = [97, 93, 90, 87, 83, 80, 77, 73, 70, 67, 63, 60, 0];
    const gradeNames = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'E'];
    const PRESETS={
        "EECS280_FS18_mean":{
            weights:"4,9,9,25,9,9,1,5,29",
            medians:"85,88.53,81.09,74,91.63,87.1,95,95,74",
            stdev:"19,16.91,21.94,15,15.18,17.28,3,3,15"
        },
        "EECS280_FS18_median":{
            weights:"4,9,9,25,9,9,1,5,29",
            medians:"89,94.66,90,76.5,96.03,94,95,95,76.5",
            stdev:"19,16.91,21.94,15,15.18,17.28,3,3,15"
        }
    }
    var barChartContext = document.getElementById("barChart").getContext('2d');
    var barChart = new Chart(barChartContext, {
        type: 'bar',
        data: {
            labels: gradeNames,
            datasets: [{
                label: '%',
                data: [],
                borderWidth: 1
            ,backgroundColor: [
                'rgba(0, 255, 170)',
                'rgba(0, 255, 115)',
                'rgba(12, 175, 55)',
                'rgba(115, 175, 12)',
                'rgba(89, 130, 20)',
                'rgba(149, 158, 30)',
                'rgba(178, 160, 73)',
                'rgba(221, 151, 0)',
                'rgba(160, 148, 91)',
                'rgba(211, 162, 101)',
                'rgba(224, 103, 67)',
                'rgba(198, 45, 0)',
                'rgba(0, 0, 0)'
            ],
            borderColor: [
                'rgba(0, 255, 170)',
                'rgba(0, 255, 115)',
                'rgba(12, 175, 55)',
                'rgba(115, 175, 12)',
                'rgba(89, 130, 20)',
                'rgba(149, 158, 30)',
                'rgba(178, 160, 73)',
                'rgba(221, 151, 0)',
                'rgba(160, 148, 91)',
                'rgba(211, 162, 101)',
                'rgba(224, 103, 67)',
                'rgba(198, 45, 0)',
                'rgba(0, 0, 0)'
            ]}]
        },
        
        options: {
            scales: {
                yAxes: [{
                    ticks: {
                        beginAtZero: true
                    }
                }]
            }
        }
    });
    populatePresetDropdown();
    $('.select2').select2();

    $('#goBtn').click(function () {
        begin();
    });
    $('#preset').change(function(){
        var selected=$(this).children("option:selected").val();
        if(selected!="null"){
            $('#gradeWeights').val(PRESETS[selected].weights);
            $('#gradeMedians').val(PRESETS[selected].medians);
            $('#gradeStDev').val(PRESETS[selected].stdev);
            begin();
        }else{
            $('#gradeWeights').val("");
            $('#gradeMedians').val("");
            $('#gradeStDev').val("");
        }
    });
    function begin(){
        var gradeWeights = trimWhitespace($('#gradeWeights').val().split(','));
        var gradeMedians = trimWhitespace($('#gradeMedians').val().split(','));
        var gradeStDev = trimWhitespace($('#gradeStDev').val().split(','));
        if (gradeWeights.length != gradeMedians.length || gradeWeights.length != gradeStDev.length) {
            alert('There appear to be an uneven amount of elements in each input box.')
        } else {
            gradeWeights = strToFloat(gradeWeights);
            var divide=checkGreaterThanOne(gradeWeights);
            if(divide){
                gradeWeights=multiply(gradeWeights,.01);
            }
            gradeMedians = strToFloat(gradeMedians);
            gradeStDev = strToFloat(gradeStDev);
            updateDistribution(gradeWeights, gradeMedians, gradeStDev);
        }
    }
    function populatePresetDropdown(){
        var select=document.getElementById("preset");
        $.each(PRESETS,function(key,value){
            var option=document.createElement("option");
            option.value=key;
            option.text=key;
            select.add(option);
        });
    }
    function updateDistribution(gradeWeights, gradeMedians, gradeStDev) {
        var total_stdev = 0;
        var total_median = 0;
        for (var i = 0; i < gradeWeights.length; i++) {
            total_stdev += Math.pow(gradeWeights[i] * gradeStDev[i], 2);
            total_median += gradeWeights[i] * gradeMedians[i];
        }
        total_stdev = Math.sqrt(total_stdev);
        $('#total_avg').text(total_median.toFixed(3));
        $('#total_stdev').text(total_stdev.toFixed(3));
        // console.log("median: " + total_median);
        // console.log("total_stdev: " + total_stdev);
        calculateValues(total_median, total_stdev);
    }
    function checkGreaterThanOne(gradeWeights){
        for(var i=0;i<gradeWeights.length;i++){
            if(gradeWeights[i]>1){
                return true;
            }
        }
        return false;
    }
    function calculateValues(med, stdev) {
        updateGradeThresholds();
        var zScores = [];
        for (var i = 0; i < gradeThresholds.length; i++) {
            zScores[i] = gradeThresholds[i] - med;
            zScores[i] /= stdev;
        }
        var percentiles = [];
        const ONE_OVER_ROOT_TWO = Math.sqrt(.5);
        for (var i = 0; i < zScores.length; i++) {
            percentiles[i] = .5 * (1 + erf(zScores[i] * ONE_OVER_ROOT_TWO, 50));
            if (percentiles[i] < 0 || percentiles[i] > 100) percentiles[i] = 0;
        }
        percentiles=multiply(percentiles,100);
        updateGraph(percentiles);
    }
    function multiply(array,val){
        for(var i=0;i<array.length;i++){
            array[i]=1.0*array[i]*val;
        }
        return array;
    }
    function toFixed_array(array,precision){
        for(var i=0;i<array.length;i++){
            if(precision)array[i]=array[i].toFixed(precision);
        }
        return array;
    }
    function updateGraph(percentiles) {
        var barValues = getBarValues(percentiles);
        barChart.data.datasets[0].data=toFixed_array(barValues,6);
        barChart.update();
    }
    function getBarValues(percentiles) {
        var newPercentiles=[];
        for (var i = 1; i < percentiles.length; i++) {
            newPercentiles[i]=percentiles[i-1] - percentiles[i];
        }
        newPercentiles[0] = 100 - percentiles[0];
        return newPercentiles;
    }
    function erf(x, iterations) {
        var m = 1.00;
        var s = 1.00;
        var sum = x * 1.0;
        for (var i = 1; i <= iterations; i++) {
            m *= i;
            s *= -1;
            sum += (s * Math.pow(x, 2.0 * i + 1.0)) / (m * (2.0 * i + 1.0));
        }
        return 2 * sum / Math.sqrt(3.14159265358979);
    }
    function updateGradeThresholds() {
        for (var i = 0; i <= 12; i++) {
            gradeThresholds[i] = parseFloat($('#grade' + i).val());
            if (gradeThresholds[i] == NaN) {
                alert("Grade received wasn't a number");
                gradeThresholds[i] = 0;
            }
        }
    }
    function trimWhitespace(textArray) {
        try {
            for (x in textArray) {
                textArray[x] = textArray[x].trim();
            }
        } catch (e) {
            console.log(e);
            alert("String trim failed, error: " + e);
            return textArray;
        }
        return textArray;
    }
    function strToFloat(textArray) {
        var floatArray = [];
        for (var i = 0; i < textArray.length; i++) {
            if (parseFloat(textArray[i]) != NaN) {
                floatArray.push(parseFloat(textArray[i]));
            } else {
                alert("Error converting values.")
            }
        }
        return floatArray;
    }
});

