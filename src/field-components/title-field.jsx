import React from 'react';

export function TitleFieldComponent({ value, inputProps = {}, className }) {
  const mergedProps = {
    ...inputProps,
    type: 'text',
    value: value ?? '',
    readOnly: true,
    className,
  };

  return <input {...mergedProps} />;
}
