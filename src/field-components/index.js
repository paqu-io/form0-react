import { TextFieldComponent } from './text-field.jsx';
import { NumericFieldComponent } from './numeric-field.jsx';
import { CalculatedFieldComponent } from './calculated-field.jsx';
import { SingleChoiceFieldComponent } from './single-choice-field.jsx';
import { BooleanFieldComponent } from './boolean-field.jsx';
import { MultiChoiceFieldComponent } from './multi-choice-field.jsx';
import { DateFieldComponent } from './date-field.jsx';
import { TimeFieldComponent } from './time-field.jsx';

export {
  TextFieldComponent,
  NumericFieldComponent,
  CalculatedFieldComponent,
  SingleChoiceFieldComponent,
  BooleanFieldComponent,
  MultiChoiceFieldComponent,
  DateFieldComponent,
  TimeFieldComponent,
};

export const defaultFieldComponents = {
  TextField: TextFieldComponent,
  NumericField: NumericFieldComponent,
  CalculatedField: CalculatedFieldComponent,
  SingleChoiceField: SingleChoiceFieldComponent,
  BooleanField: BooleanFieldComponent,
  MultiChoiceField: MultiChoiceFieldComponent,
  DateField: DateFieldComponent,
  TimeField: TimeFieldComponent,
};
