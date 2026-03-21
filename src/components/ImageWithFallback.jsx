import React, { useState } from 'react';

const ImageWithFallback = ({ src, fallbackSrc, alt, ...props }) => {
  const [imgSrc, setImgSrc] = useState(src);
  const [hasError, setHasError] = useState(false);

  const handleError = () => {
    if (fallbackSrc && !hasError) {
      setImgSrc(fallbackSrc);
      setHasError(true);
    } else if (!hasError) {
      // Hide the image container if both src and fallback fail
      setHasError(true);
    }
  };

  if (hasError) {
    return null; // Or render a placeholder
  }

  return <img src={imgSrc} alt={alt} onError={handleError} {...props} />;
};

export default ImageWithFallback;