const circuitModel='Модель: элементы цепи сосредоточенные, провода идеальные; систему отсчёта связываем с неподвижной цепью. Механическое движение отсутствует, поэтому оси и проекции механических сил здесь не нужны. Положительные направления тока и напряжения выбираем согласованно; если полярность не задана, искомые заряд и напряжение понимаем по модулю.';
function record(answer,body,stages,source,comparison,extra={}) {
  return {answer,solution:body.trim()+`\n\nОтвет: ${answer}.`,stages,diagramCaption:stages.map(s=>s.join(': ')).join('. ')+'.',source,comparison,...extra};
}
module.exports={record,circuitModel};
