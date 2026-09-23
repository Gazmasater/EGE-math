const gasModel='Модель: разреженные газы считаем идеальными. Система отсчёта связана с сосудом. Для расчёта состояния неподвижного газа механические оси и проекции сил не требуются: используем давление, объём и абсолютную температуру. Универсальная газовая постоянная R = 8,31 Дж·моль⁻¹·К⁻¹; при переводе температуры используем T = t + 273 К.';
function record(answer,body,stages,source,comparison,extra={}) {
  return {answer,solution:body.trim()+`\n\nОтвет: ${answer}.`,stages,diagramCaption:stages.map(s=>s.join(': ')).join('. ')+'.',source,comparison,...extra};
}
module.exports={gasModel,record};
