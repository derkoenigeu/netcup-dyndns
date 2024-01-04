import express from 'express';
import NetcupApi from 'netcup-node';
import 'dotenv/config'

if(!process.env.API_KEY || process.env.API_KEY === "") {
    throw Error('No API_KEY found!')
}

if(!process.env.PASSWORD || process.env.PASSWORD === "") {
    throw Error('No PASSWORD found!')
}

if(!process.env.USER || process.env.USER === "") {
    throw Error('No USER found!')
}

if(!process.env.RECORDS || process.env.RECORDS === "") {
    throw Error('No RECORDS found!')
}

const api = await new NetcupApi().init({
    apikey: process.env.API_KEY,
    apipassword: process.env.PASSWORD,
    customernumber: process.env.USER
})

const app = express()

app.get('/', async (req, res) => {
    const ip = req.query['ip']
    if(!ip || ip.length <= 0) {
        res.status(400).send('Missing IP')
        return
    }
    try {
        for(const domainRecord of process.env.RECORDS.split(';')) {
            if(domainRecord) {
                const domain = domainRecord.split(':')[0]
                const records = domainRecord.split(':')[1].split(',')
                const remoteRecords = (await api.infoDnsRecords({ domainname: domain})).responsedata.dnsrecords
                for(const record of records) {
                    const recordsToUpdate = remoteRecords.filter(rr => rr.hostname === record && rr.type === 'A')
                    if(recordsToUpdate.length >= 0) {
                        for(const recToUpdate of recordsToUpdate) {
                            const res = await api.updateDnsRecords({
                                domainname: domain,
                                dnsrecordset: {
                                    dnsrecords: [{
                                        ...recToUpdate,
                                        destination: ip
                                    }]
                                }
                            })
                            console.log(`Updated record ${domain}: ${recToUpdate.hostname} to ip ${ip}`)
                        }
                    }
                }
            }
        }
        console.log('Updated successfully!');
        res.status(200).send('Update successfull')
    } catch (error) {
        console.error('An error occurred during DNS Update', error);
        res.status(500).send('An error occurred!')
    }
})

app.listen(process.env.PORT || 3000, () => {
    console.log('DynDNS is running!')
})