import {MessageDescriptor, useIntl} from "react-intl";
import {PrimitiveType} from "intl-messageformat";
import ReactMarkdown from "react-markdown/with-html";
import React from "react";

export default function FormattedMarkdown(descriptor: MessageDescriptor, values?: Record<string, PrimitiveType>) {
  const {formatMessage} = useIntl();
  formatMessage(descriptor, values)
  return (
      <ReactMarkdown source={formatMessage(descriptor, values)}/>
  );
}