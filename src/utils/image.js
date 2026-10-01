// Foto de perfil: recorta al centro en cuadrado, reduce a 256px y comprime a
// JPEG hasta que quepa en el límite del servidor (60 KB de data URL).
const SIZE = 256;
const MAX_LENGTH = 58000;

const loadImage = (file) => new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('No se pudo leer la imagen.')); };
    img.src = url;
});

export const fileToAvatar = async (file) => {
    if (!file.type.startsWith('image/')) throw new Error('Elige un archivo de imagen.');
    const img = await loadImage(file);
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const canvas = document.createElement('canvas');
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, SIZE, SIZE);
    for (let quality = 0.88; quality >= 0.4; quality -= 0.12) {
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        if (dataUrl.length <= MAX_LENGTH) return dataUrl;
    }
    throw new Error('La imagen es demasiado pesada. Prueba con otra.');
};
