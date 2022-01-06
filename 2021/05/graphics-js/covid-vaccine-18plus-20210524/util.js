var getQuants = function (arr) {
  var firstDoseVals = arr
    .filter(a => a && isFinite(a))
    .sort((a, b) => Number(a) - Number(b));
  var firstQuart = quantile(firstDoseVals, 0.25);
  var secondQuart = Math.max(quantile(firstDoseVals, 0.5), firstQuart + 1);
  var thirdQuart = Math.max(quantile(firstDoseVals, 0.75), secondQuart + 1);

  var ave = Math.round(
    (secondQuart - firstQuart + (thirdQuart - secondQuart)) / 2
  );
  secondQuart = firstQuart + ave;
  thirdQuart = secondQuart + ave;

  return [firstQuart, secondQuart, thirdQuart]
};

var quantile = function (sorted, quantile) {
  const position = (sorted.length - 1) * quantile;
  const base = Math.floor(position);
  const rest = position - base;
  var quant = sorted[base];

  return Math.round(quant);
};

module.exports = {
  getQuants,
};
