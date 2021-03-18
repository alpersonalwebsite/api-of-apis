const apiPOSTResponseDataForTests = {
  city: { lng: '-0.12574', lat: '51.50853', name: 'London' },
  weather: {
    days: { days: 2 },
    currentMin: { icon: 'c02d', code: 802, description: 'Scattered clouds' },
    forecastMin: [
      {
        date: '2021-03-15',
        temp: 10.2,
        weather: { icon: 'c04d', code: 804, description: 'Overcast clouds' }
      },
      {
        date: '2021-03-16',
        temp: 9.4,
        weather: { icon: 'c04d', code: 804, description: 'Overcast clouds' }
      }
    ]
  },
  photos: [
    {
      previewURL: 'https://cdn.pixabay.com/photo/2021/02/27/04/03/crocus-6053680_150.jpg',
      tags: 'animals, birds, nature'
    }
  ]
}

export { apiPOSTResponseDataForTests }
