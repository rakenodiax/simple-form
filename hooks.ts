/*
 * TODO: simplify custom onChange value generic logic
 */
import {ChangeEvent, useState} from 'react';

export type UseForm<F extends Record<string, unknown>> = {
  formData: F;
  setValue: <K extends keyof F>(name: K, value: F[K]) => void;
  field: <K extends keyof F, V = ChangeEvent<HTMLInputElement>>(
    name: K,
    opts?: FieldOpts<F, K, V>,
  ) => {
    value: F[K];
    onChange: (value: V) => void;
  };
  errors: Partial<Record<keyof F, string>>;
  isValid: boolean;
};

interface FormData<V extends unknown> extends Record<string, V> {}

const isEvent = (v: unknown): v is ChangeEvent => {
  if (
    !(
      v !== null &&
      typeof v === 'object' &&
      Object.prototype.hasOwnProperty.call(v, 'currentTarget')
    )
  ) {
    return false;
  }

  const {currentTarget} = v as {currentTarget: unknown};

  return (
    currentTarget !== null &&
    typeof currentTarget === 'object' &&
    Object.prototype.hasOwnProperty.call(currentTarget, 'value') &&
    typeof (currentTarget as {value: unknown}).value === 'string'
  );
};

export type UseFormOpts<F extends FormData<unknown>> = {
  validate?: (form: F) => Partial<Record<keyof F, string>>;
};

export type FieldOpts<
  F extends FormData<unknown>,
  K extends keyof F,
  V = ChangeEvent<HTMLInputElement>,
> = {
  validate?: {validator?: (value: F[K]) => boolean; message?: string};
  map?: (event: V) => F[K];
  muiHelpers?: ['error', 'helperText'];
};

const initErrors = <F extends FormData<unknown>>(
  initialValues: F,
  options?: UseFormOpts<F>,
): Partial<Record<keyof F, string>> => {
  return options?.validate?.(initialValues) ?? {};
};

export const useForm = <F extends FormData<unknown>>(
  initialValues: F,
  options?: UseFormOpts<F>,
): UseForm<F> => {
  const [formData, setFormData] = useState<F>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof F, string>>>(
    initErrors(initialValues, options),
  );

  const setValue = <K extends keyof F>(name: K, value: F[K]): void => {
    const newData = {...formData, [name]: value};
    setFormData(newData);

    if (typeof options?.validate === 'function') {
      setErrors(options.validate(newData));
    }
  };

  const field = <K extends keyof F, V = ChangeEvent<HTMLInputElement>>(
    name: K,
    opts: FieldOpts<F, K, V> = {},
  ) => ({
    name,
    value: formData[name],
    onChange: (fieldValue: V) => {
      if (!isEvent(fieldValue) && opts.map === void 0) {
        throw new TypeError(
          'Non-event field handlers require a mapping from onChange value to form value',
        );
      }
      const value =
        opts.map === void 0
          ? ((fieldValue as unknown as ChangeEvent<HTMLInputElement>).currentTarget.value as F[K])
          : opts.map(fieldValue);
      const validationResult = opts.validate?.validator?.(value);
      setValue(name, value);
      setErrors((e) => ({
        ...e,
        [name]:
          validationResult === false ? opts.validate?.message ?? `${name} invalid` : undefined,
      }));
    },
    error: opts.muiHelpers?.includes('error') === true ? errors[name] !== void 0 : undefined,
    helperText: opts.muiHelpers?.includes('helperText') === true ? errors[name] : undefined,
  });

  return {
    formData,
    setValue,
    field,
    errors,
    isValid: !Object.values(errors).some((v) => v !== void 0),
  };
};
