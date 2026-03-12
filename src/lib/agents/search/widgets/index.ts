import calculationWidget from './calculationWidget';
import WidgetExecutor from './executor';
import stockWidget from './stockWidget';

WidgetExecutor.register(calculationWidget);
WidgetExecutor.register(stockWidget);

export { WidgetExecutor };
